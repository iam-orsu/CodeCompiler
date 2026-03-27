import docker
import asyncio
import tarfile
import io
import time
import os
import logging
from fastapi import WebSocket, WebSocketDisconnect
from pool import get_container, LANGUAGES
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TIMEOUT_INTERPRETED = int(os.getenv("EXECUTION_TIMEOUT_INTERPRETED", "15"))
TIMEOUT_COMPILED = int(os.getenv("EXECUTION_TIMEOUT_COMPILED", "30"))
COMPILED_LANGS = {"c", "cpp", "java", "go", "rust", "csharp", "mongodb"}

docker_client = docker.from_env()

def create_tar(filename: str, code: str) -> bytes:
    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode='w') as tar:
        encoded = code.encode('utf-8')
        tinfo = tarfile.TarInfo(name=filename)
        tinfo.size = len(encoded)
        tinfo.mtime = int(time.time())
        tinfo.uid = 1000
        tinfo.gid = 1000
        tinfo.mode = 0o755  # Ensure executable and readable
        tar.addfile(tinfo, io.BytesIO(encoded))
    return tar_stream.getvalue()

async def cleanup_container(container):
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, lambda: container.remove(force=True))
    except Exception as e:
        logger.debug(f"Container cleanup error (non-critical): {e}")

async def execute_code(ws: WebSocket, lang: str, code: str):
    if lang not in LANGUAGES:
        await ws.send_json({"type": "stderr", "data": f"Unsupported language: {lang}\n"})
        return

    try:
        container = await get_container(lang)
    except Exception as e:
        await ws.send_json({"type": "stderr", "data": f"System error getting container: {str(e)}\n"})
        return

    loop = asyncio.get_running_loop()
    filename = LANGUAGES[lang]

    # Java: public class name must match filename
    if lang == "java":
        import re
        match = re.search(r'public\s+class\s+(\w+)', code)
        if match:
            filename = f"{match.group(1)}.java"

    tar_data = create_tar(filename, code)

    try:
        await loop.run_in_executor(None, lambda: container.put_archive("/code", tar_data))
    except Exception as e:
        await ws.send_json({"type": "stderr", "data": f"Failed to prepare container: {e}\n"})
        asyncio.create_task(cleanup_container(container))
        return

    # CRITICAL: Attach socket BEFORE starting the container.
    # Otherwise fast commands (SQLite, etc.) finish before socket is ready
    # and output is lost.
    try:
        sock = await loop.run_in_executor(
            None, 
            lambda: docker_client.api.attach_socket(
                container.id, 
                params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1}
            )
        )
        sock._sock.setblocking(False)
    except Exception as e:
        await ws.send_json({"type": "stderr", "data": f"Socket attach failed: {e}\n"})
        asyncio.create_task(cleanup_container(container))
        return

    try:
        await loop.run_in_executor(None, container.start)
    except Exception as e:
        await ws.send_json({"type": "stderr", "data": f"Failed to start container: {e}\n"})
        try:
            sock._sock.close()
        except Exception:
            pass
        asyncio.create_task(cleanup_container(container))
        return

    timeout = TIMEOUT_COMPILED if lang in COMPILED_LANGS else TIMEOUT_INTERPRETED

    async def read_from_container():
        try:
            while True:
                data = await loop.sock_recv(sock._sock, 4096)
                if not data:
                    break
                await ws.send_json({"type": "stdout", "data": data.decode('utf-8', errors='replace')})
        except (OSError, ConnectionError):
            pass
        except Exception as e:
            logger.debug(f"Read error: {e}")

    async def write_to_container():
        try:
            while True:
                msg = await ws.receive_json()
                if msg.get("type") == "stdin" and msg.get("data"):
                    await loop.sock_sendall(sock._sock, msg["data"].encode('utf-8'))
        except WebSocketDisconnect:
            pass
        except (OSError, ConnectionError):
            pass
        except Exception as e:
            logger.debug(f"Write error: {e}")

    async def wait_for_exit():
        # wait blocks synchronously until execution is done
        return await loop.run_in_executor(None, container.wait)

    read_task = asyncio.create_task(read_from_container())
    write_task = asyncio.create_task(write_to_container())
    wait_task = asyncio.create_task(wait_for_exit())

    try:
        await asyncio.wait_for(wait_task, timeout=timeout)
        # Give the socket a moment to flush the final output
        await asyncio.sleep(0.1)
    except asyncio.TimeoutError:
        await ws.send_json({"type": "stderr", "data": f"\nExecution timed out ({timeout}s)"})
    except Exception as e:
        logger.debug(f"Execution error: {e}")
    finally:
        write_task.cancel()
        read_task.cancel()
        wait_task.cancel()
        # Close the raw socket to prevent fd leaks
        try:
            sock._sock.close()
        except Exception:
            pass
        asyncio.create_task(cleanup_container(container))
        
        try:
            await ws.send_json({"type": "exit", "data": "Process exited"})
            await ws.close()
        except Exception:
            pass
