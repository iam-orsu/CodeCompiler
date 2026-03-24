from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

from pool import initialize_pool, cleanup_pool
from executor import execute_code

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize_pool()
    yield
    # Shutdown
    await cleanup_pool()

app = FastAPI(title="Runly.dev Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws/execute")
async def websocket_execute(ws: WebSocket):
    await ws.accept()
    try:
        msg = await ws.receive_text()
        data = json.loads(msg)
        lang = data.get("language")
        code = data.get("code")

        if not lang or not code:
            await ws.send_json({"type": "stderr", "data": "Error: Missing parameter `language` or `code`"})
            await ws.close()
            return
            
        await execute_code(ws, lang, code)
    except WebSocketDisconnect:
        pass
    except json.JSONDecodeError:
        try:
            await ws.send_json({"type": "stderr", "data": "Invalid JSON format payload sequence."})
            await ws.close()
        except:
            pass
    except Exception as e:
        try:
            await ws.send_json({"type": "stderr", "data": f"Internal Error: {str(e)}"})
            await ws.close()
        except:
            pass
