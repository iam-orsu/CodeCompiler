from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
import uuid
import logging
import re
import time
from datetime import datetime, timezone

import redis.asyncio as aioredis
from pydantic import BaseModel
from pool import initialize_pool, cleanup_pool, LANGUAGES
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

# CORS origins: comma-separated list, empty = allow all (dev mode)
_cors_raw = os.getenv("ALLOWED_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()] if _cors_raw else ["*"]

# Rate limit for code execution (per IP per minute)
WS_RATE_LIMIT = int(os.getenv("MAX_WS_RATE_PER_MIN", "30"))
MAX_CODE_SIZE = int(os.getenv("MAX_CODE_SIZE", "50000"))  # 50KB

# Redis client ref for WS rate limiting (reuses session_db's connection)
_rate_redis: aioredis.Redis = None

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
    global _rate_redis
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
    try:
        _rate_redis = aioredis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"), decode_responses=True)
    except Exception as e:
        logger.warning(f"Rate limit Redis init failed: {e}")
    yield
    # Shutdown
    if _rate_redis:
        await _rate_redis.aclose()
    await close_session_db()
    await close_redis()
    await cleanup_pool()

app = FastAPI(title="Runly.dev Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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


async def _check_ws_rate(ip: str) -> bool:
    """Check per-IP rate limit for WS executions. Returns True if allowed."""
    if not _rate_redis:
        return True  # If Redis is down, allow (fail-open)
    try:
        key = f"ws_rate:{ip}:{int(time.time()) // 60}"  # 1-minute window
        pipe = _rate_redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 120)  # 2 min TTL (safety margin for clock drift)
        results = await pipe.execute()
        count = results[0]
        return count <= WS_RATE_LIMIT
    except Exception:
        return True


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
        # Rate limit by IP
        forwarded = ws.headers.get("x-real-ip") or ws.headers.get("x-forwarded-for", "")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (ws.client.host if ws.client else "unknown")
        if not await _check_ws_rate(client_ip):
            await ws.send_json({"type": "stderr", "data": f"Rate limit exceeded ({WS_RATE_LIMIT}/min). Please slow down."})
            await ws.close(code=1008)
            return

        msg = await ws.receive_text()
        data = json.loads(msg)
        lang = data.get("language")
        code = data.get("code")
        session_id = data.get("session_id")

        if not lang or not code:
            await ws.send_json({"type": "stderr", "data": "Error: Missing parameter `language` or `code`"})
            await ws.close()
            return

        # Validate language against known list
        if lang not in LANGUAGES:
            await ws.send_json({"type": "stderr", "data": f"Unsupported language: {lang}"})
            await ws.close()
            return

        # Code size limit
        if len(code) > MAX_CODE_SIZE:
            await ws.send_json({"type": "stderr", "data": f"Code too large ({len(code)} bytes). Max: {MAX_CODE_SIZE} bytes."})
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
