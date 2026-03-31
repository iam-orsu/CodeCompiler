import docker
import asyncio
import tarfile
import io
import re
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
EXTENDED_TIMEOUT_LANGS = {"c", "cpp", "java", "go", "rust", "csharp", "mongodb"}

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
        logger.error(f"Container acquisition error for {lang}: {e}")
        await ws.send_json({"type": "stderr", "data": "System error: could not allocate a runner. Try again.\n"})
        return

    loop = asyncio.get_running_loop()
    filename = LANGUAGES[lang]

    # Java: public class name must match filename
    if lang == "java":
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
        # Keep socket in blocking mode - it runs in a thread executor
    except Exception as e:
        logger.error(f"Socket attach failed for {lang}: {e}")
        await ws.send_json({"type": "stderr", "data": "Failed to attach to runner.\n"})
        asyncio.create_task(cleanup_container(container))
        return

    try:
        await loop.run_in_executor(None, container.start)
    except Exception as e:
        logger.error(f"Container start failed for {lang}: {e}")
        await ws.send_json({"type": "stderr", "data": "Failed to start runner.\n"})
        try:
            sock._sock.close()
        except Exception:
            pass
        asyncio.create_task(cleanup_container(container))
        return

    timeout = TIMEOUT_COMPILED if lang in EXTENDED_TIMEOUT_LANGS else TIMEOUT_INTERPRETED
    disconnect_event = asyncio.Event()

    async def read_from_container():
        def _read():
            try:
                raw = sock._sock
                while True:
                    data = raw.recv(4096)
                    if not data:
                        break
                    try:
                        future = asyncio.run_coroutine_threadsafe(
                            ws.send_json({"type": "stdout", "data": data.decode('utf-8', errors='replace')}),
                            loop
                        )
                        future.result(timeout=5)
                    except Exception:
                        break  # WS closed or send failed
            except Exception as e:
                logger.debug(f"Read thread error: {e}")

        await loop.run_in_executor(None, _read)

    async def write_to_container():
        try:
            while True:
                msg = await ws.receive_json()
                if msg.get("type") == "stdin" and msg.get("data"):
                    raw = msg["data"].encode('utf-8')
                    await loop.run_in_executor(None, lambda d=raw: sock._sock.sendall(d))
        except WebSocketDisconnect:
            disconnect_event.set()
        except (OSError, ConnectionError):
            disconnect_event.set()
        except Exception as e:
            logger.debug(f"Write error: {e}")

    async def wait_for_exit():
        # wait blocks synchronously until execution is done
        return await loop.run_in_executor(None, container.wait)

    async def wait_for_disconnect():
        await disconnect_event.wait()

    read_task = asyncio.create_task(read_from_container())
    write_task = asyncio.create_task(write_to_container())
    wait_task = asyncio.create_task(wait_for_exit())
    disconnect_task = asyncio.create_task(wait_for_disconnect())

    try:
        # Race: container exits vs timeout vs user disconnects
        done, _ = await asyncio.wait(
            [wait_task, disconnect_task],
            timeout=timeout,
            return_when=asyncio.FIRST_COMPLETED,
        )

        if not done:
            # Timeout - neither finished
            await ws.send_json({"type": "stderr", "data": f"\nExecution timed out ({timeout}s)"})
        elif disconnect_task in done:
            # User closed tab - skip sending messages
            pass
        else:
            # Normal exit - give socket a moment to flush final output
            await asyncio.sleep(0.1)
    except Exception as e:
        logger.debug(f"Execution error: {e}")
    finally:
        write_task.cancel()
        read_task.cancel()
        wait_task.cancel()
        disconnect_task.cancel()
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

