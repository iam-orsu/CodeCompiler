from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import logging

from pool import initialize_pool, cleanup_pool
from executor import execute_code

logger = logging.getLogger(__name__)

# Configurable via env; comma-separated list. Empty = allow all (dev mode).
_raw_origins = os.getenv("ALLOWED_WS_ORIGINS", "")
ALLOWED_WS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else []

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
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws/execute")
async def websocket_execute(ws: WebSocket):
    # Validate Origin header to prevent cross-site WebSocket hijacking
    if ALLOWED_WS_ORIGINS:
        origin = ws.headers.get("origin", "")
        if origin not in ALLOWED_WS_ORIGINS:
            await ws.close(code=1008)  # Policy Violation
            return

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
        except Exception:
            pass
    except Exception as e:
        logger.error(f"WebSocket handler error: {e}")
        try:
            await ws.send_json({"type": "stderr", "data": "An internal error occurred."})
            await ws.close()
        except Exception:
            pass

