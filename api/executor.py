import docker
import asyncio
import tarfile
import io
import time
import os
from fastapi import WebSocket, WebSocketDisconnect
from pool import get_container, LANGUAGES
from dotenv import load_dotenv

load_dotenv()

TIMEOUT_INTERPRETED = int(os.getenv("EXECUTION_TIMEOUT_INTERPRETED", "15"))
TIMEOUT_COMPILED = int(os.getenv("EXECUTION_TIMEOUT_COMPILED", "30"))
COMPILED_LANGS = {"c", "cpp", "java", "go", "rust", "scala"}

docker_client = docker.from_env()

def create_tar(filename: str, code: str) -> bytes:
    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode='w') as tar:
        encoded = code.encode('utf-8')
        tinfo = tarfile.TarInfo(name=filename)
        tinfo.size = len(encoded)
        tinfo.mtime = int(time.time())
        tar.addfile(tinfo, io.BytesIO(encoded))
    return tar_stream.getvalue()

async def cleanup_container(container):
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, lambda: container.remove(force=True))
    except Exception:
        pass

async def execute_code(ws: WebSocket, lang: str, code: str):
    if lang not in LANGUAGES:
        await ws.send_json({"type": "stderr", "data": f"Unsupported language: {lang}\n"})
        return

    try:
        container = await get_container(lang)
    except Exception as e:
        await ws.send_json({"type": "stderr", "data": f"System error getting container: {str(e)}\n"})
        return

    loop = asyncio.get_event_loop()
    filename = LANGUAGES[lang]
    tar_data = create_tar(filename, code)

    try:
        await loop.run_in_executor(None, lambda: container.put_archive("/code", tar_data))
        await loop.run_in_executor(None, container.start)
    except Exception as e:
        await ws.send_json({"type": "stderr", "data": f"Failed to start container: {e}\n"})
        asyncio.create_task(cleanup_container(container))
        return

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

    timeout = TIMEOUT_COMPILED if lang in COMPILED_LANGS else TIMEOUT_INTERPRETED

    async def read_from_container():
        try:
            while True:
                data = await loop.sock_recv(sock._sock, 4096)
                if not data:
                    break
                await ws.send_json({"type": "stdout", "data": data.decode('utf-8', errors='replace')})
        except Exception:
            pass

    async def write_to_container():
        try:
            while True:
                msg = await ws.receive_json()
                if msg.get("type") == "stdin" and msg.get("data"):
                    await loop.sock_sendall(sock._sock, msg["data"].encode('utf-8'))
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    async def wait_for_exit():
        # wait blocks synchronously until execution is done
        return await loop.run_in_executor(None, container.wait)

    read_task = asyncio.create_task(read_from_container())
    write_task = asyncio.create_task(write_to_container())
    wait_task = asyncio.create_task(wait_for_exit())

    try:
        done, pending = await asyncio.wait(
            [read_task, wait_task], 
            return_when=asyncio.FIRST_COMPLETED,
            timeout=timeout
        )
        if wait_task not in done:
            await ws.send_json({"type": "stderr", "data": f"\nExecution timed out ({timeout}s)"})
    except Exception:
        pass
    finally:
        write_task.cancel()
        read_task.cancel()
        wait_task.cancel()
        asyncio.create_task(cleanup_container(container))
        
        try:
            await ws.send_json({"type": "exit", "data": "Process exited"})
            await ws.close()
        except:
            pass
