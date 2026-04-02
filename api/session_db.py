import os
import redis.asyncio as redis
from datetime import datetime, timezone

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
SESSION_TTL = int(os.getenv("SESSION_TTL", "3600"))

redis_client: redis.Redis = None

async def init_session_db():
    global redis_client
    if not redis_client:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return True

async def close_session_db():
    global redis_client
    if redis_client:
        await redis_client.aclose()

async def get_db_limits(session_id: str) -> dict:
    key = f"temp_session:{session_id}"
    data = await redis_client.hgetall(key)
    
    if not data:
        # Auto-initialize session if not found on first load/refresh
        await init_session(session_id)
        data = await redis_client.hgetall(key)
        
        # Fallback if init somehow failed
        if not data:
            return {
                "creates": 0,
                "inserts": 0,
                "extended_count": 0,
                "remaining_time": 0,
                "expired": True
            }
    
    ttl = await redis_client.ttl(key)
    return {
        "creates": int(data.get("creates", 0)),
        "inserts": int(data.get("inserts", 0)),
        "extended_count": int(data.get("extended_count", 0)),
        "remaining_time": ttl if ttl > 0 else 0,
        "expired": ttl <= 0
    }

async def validate_session(session_id: str) -> bool:
    key = f"temp_session:{session_id}"
    exists = await redis_client.exists(key)
    return bool(exists)

async def init_session(session_id: str) -> bool:
    key = f"temp_session:{session_id}"
    exists = await redis_client.exists(key)
    if not exists:
        now = int(datetime.now(timezone.utc).timestamp())
        await redis_client.hset(key, mapping={
            "creates": 0,
            "inserts": 0,
            "created_at": now,
            "extended_count": 0,
            "last_extended_at": now,
            "tracked_tables": "[]",
            "tracked_inserts": "{}"
        })
        await redis_client.expire(key, SESSION_TTL)
    return True

async def extend_session(session_id: str) -> tuple[bool, str, int]:
    key = f"temp_session:{session_id}"
    data = await redis_client.hgetall(key)
    
    if not data:
        return False, "Session expired. Refresh page to start new session.", 0
        
    extended_count = int(data.get("extended_count", 0))
    if extended_count >= 5:
        return False, "Max session duration reached (6 hours). Please refresh the page.", 0
        
    now = int(datetime.now(timezone.utc).timestamp())
    
    # Reset quotas and increment extension count
    await redis_client.hset(key, mapping={
        "creates": 0,
        "inserts": 0,
        "extended_count": extended_count + 1,
        "last_extended_at": now,
        "tracked_tables": "[]",
        "tracked_inserts": "{}"
    })
    
    # Refresh TTL
    await redis_client.expire(key, SESSION_TTL)
    
    return True, "Session extended successfully", SESSION_TTL

import json

async def check_and_commit_limits(session_id: str, new_tables: set, new_inserts: dict) -> tuple[bool, str]:
    if not new_tables and not new_inserts:
        return True, ""
        
    key = f"temp_session:{session_id}"
    data = await redis_client.hgetall(key)
    
    if not data:
        return False, "Session expired. Refresh page to start new session."
        
    current_creates = int(data.get("creates", 0))
    current_inserts = int(data.get("inserts", 0))
    
    tracked_tables = set(json.loads(data.get("tracked_tables", "[]")))
    tracked_inserts = dict(json.loads(data.get("tracked_inserts", "{}")))
    
    actual_new_tables = new_tables - tracked_tables
    added_creates = len(actual_new_tables)
    
    added_inserts = 0
    for tbl, count in new_inserts.items():
        prev = tracked_inserts.get(tbl, 0)
        if count > prev:
            added_inserts += (count - prev)
            tracked_inserts[tbl] = count
            
    if current_creates + added_creates > 5:
        return False, "CREATE limit reached (5/5). Extend session or wait 1 hour."
        
    if current_inserts + added_inserts > 50:
        return False, "Row limit reached (50/50). Extend session or wait 1 hour."
        
    # Commit
    updates = {}
    if added_creates > 0:
        tracked_tables.update(actual_new_tables)
        updates["tracked_tables"] = json.dumps(list(tracked_tables))
        await redis_client.hincrby(key, "creates", added_creates)
    if added_inserts > 0:
        updates["tracked_inserts"] = json.dumps(tracked_inserts)
        await redis_client.hincrby(key, "inserts", added_inserts)
        
    if updates:
        await redis_client.hset(key, mapping=updates)
        
    return True, ""
