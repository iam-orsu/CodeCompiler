from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
import uuid
import logging
import re
from datetime import datetime, timezone

from pydantic import BaseModel
from pool import initialize_pool, cleanup_pool
from executor import execute_code
from session_db import init_session_db, close_session_db, get_db_limits, extend_session
from chatbot import (
    ChatRequest,
    ChatResponse,
    ChatMetadata,
    init_redis,
    close_redis,
    check_rate_limit,
    increment_rate_limit,
    chat_with_nvidia,
    store_conversation,
)

logger = logging.getLogger(__name__)

# Configurable via env; comma-separated list. Empty = allow all (dev mode).
_raw_origins = os.getenv("ALLOWED_WS_ORIGINS", "")
ALLOWED_WS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else []

def extract_highlighted_lines(text: str) -> list[int]:
    lines = set()
    matches = re.finditer(r'(?i)Line[s]?\s*(\d+)(?:\s*-\s*(\d+))?', text)
    for match in matches:
        start = int(match.group(1))
        if match.group(2):
            end = int(match.group(2))
            for i in range(start, end + 1):
                lines.add(i)
        else:
            lines.add(start)
    return sorted(list(lines))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize_pool()
    try:
        await init_redis()
    except Exception as e:
        logger.warning(f"Chatbot Redis init failed (chat will be degraded): {e}")
    try:
        await init_session_db()
    except Exception as e:
        logger.warning(f"Session DB Redis init failed: {e}")
    yield
    # Shutdown
    await close_session_db()
    await close_redis()
    await cleanup_pool()

app = FastAPI(title="Runly.dev Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtendRequest(BaseModel):
    session_id: str = None


@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/api/session/status")
async def session_status(request: Request):
    session_id = request.headers.get("x-session-id")
    if not session_id:
        return JSONResponse(status_code=400, content={"error": "Missing X-Session-ID header"})
    limits = await get_db_limits(session_id)
    return limits

@app.post("/api/session/extend")
async def session_extend(req: ExtendRequest, request: Request):
    session_id = req.session_id or request.headers.get("x-session-id")
    if not session_id:
        return JSONResponse(status_code=400, content={"error": "Missing session_id"})
    
    success, msg, ttl = await extend_session(session_id)
    if not success:
        return JSONResponse(status_code=400, content={"error": msg})
        
    return {"success": True, "message": msg, "new_remaining_time": ttl}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    """
    AI Tutor chat endpoint.
    Accepts a student question + optional code context, returns Socratic hints.
    Rate-limited per IP (configurable via CHAT_RATE_LIMIT_PER_DAY).
    """
    # Extract client IP (respects X-Forwarded-For from nginx)
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

    # Check rate limit
    allowed, remaining = await check_rate_limit(client_ip)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Daily limit reached. The AI Tutor has a limited number of free requests per day.",
                "remaining_requests": 0,
            },
        )

    # Generate or reuse session ID
    session_id = req.session_id or str(uuid.uuid4())

    # Call NVIDIA API
    ai_response = await chat_with_nvidia(
        language=req.language,
        user_message=req.user_message,
        code_attempted=req.code_attempted,
        session_id=session_id,
    )

    # Increment rate limit after successful call
    remaining = await increment_rate_limit(client_ip)

    # Extract lines from response
    lines = extract_highlighted_lines(ai_response)

    # Store conversation
    await store_conversation(session_id, req.language, req.user_message, ai_response)

    return ChatResponse(
        response=ai_response,
        highlighted_lines=lines,
        metadata=ChatMetadata(
            language=req.language,
            timestamp=datetime.now(timezone.utc).isoformat(),
            remaining_requests=remaining,
            session_id=session_id,
        ),
    )


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
        session_id = data.get("session_id")

        if not lang or not code:
            await ws.send_json({"type": "stderr", "data": "Error: Missing parameter `language` or `code`"})
            await ws.close()
            return
            
        await execute_code(ws, lang, code, session_id)
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
