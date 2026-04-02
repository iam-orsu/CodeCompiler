import os
import json
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

# ---------------------------------------------------------------------------
# Lua Scripts — All quota operations are ATOMIC (no race conditions)
# ---------------------------------------------------------------------------

# Lua: init_session — HSETNX-style to avoid overwriting existing session
_LUA_INIT_SESSION = """
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local now = tonumber(ARGV[2])

if redis.call('EXISTS', key) == 1 then
    return 0
end

redis.call('HSET', key,
    'creates', 0,
    'inserts', 0,
    'updates', 0,
    'deletes', 0,
    'created_at', now,
    'extended_count', 0,
    'last_extended_at', now,
    'tracked_tables', '[]',
    'tracked_inserts', '{}'
)
redis.call('EXPIRE', key, ttl)
return 1
"""

# Lua: extend_session — atomic check-and-extend
_LUA_EXTEND_SESSION = """
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local now = tonumber(ARGV[2])

if redis.call('EXISTS', key) == 0 then
    return {0, 'Session expired. Refresh page to start new session.', 0}
end

local ext_count = tonumber(redis.call('HGET', key, 'extended_count') or '0')
if ext_count >= 5 then
    return {0, 'Max session duration reached (6 hours). Please refresh the page.', 0}
end

redis.call('HSET', key,
    'creates', 0,
    'inserts', 0,
    'updates', 0,
    'deletes', 0,
    'extended_count', ext_count + 1,
    'last_extended_at', now,
    'tracked_tables', '[]',
    'tracked_inserts', '{}'
)
redis.call('EXPIRE', key, ttl)
return {1, 'Session extended successfully', ttl}
"""

# Lua: check_and_commit_limits — atomic read-validate-write
_LUA_COMMIT_LIMITS = """
local key = KEYS[1]
local new_tables_json = ARGV[1]
local new_inserts_json = ARGV[2]
local dyn_updates = tonumber(ARGV[3])
local dyn_deletes = tonumber(ARGV[4])

if redis.call('EXISTS', key) == 0 then
    return {0, 'Session expired. Refresh page to start new session.'}
end

local current_creates = tonumber(redis.call('HGET', key, 'creates') or '0')
local current_inserts = tonumber(redis.call('HGET', key, 'inserts') or '0')
local current_updates = tonumber(redis.call('HGET', key, 'updates') or '0')
local current_deletes = tonumber(redis.call('HGET', key, 'deletes') or '0')
local current_row_ops = current_inserts + current_updates + current_deletes

local tracked_tables_raw = redis.call('HGET', key, 'tracked_tables') or '[]'
local tracked_inserts_raw = redis.call('HGET', key, 'tracked_inserts') or '{}'

-- Decode JSON using cjson
local tracked_tables_set = {}
local tracked_tables_list = cjson.decode(tracked_tables_raw)
for _, t in ipairs(tracked_tables_list) do
    tracked_tables_set[t] = true
end

local tracked_inserts = cjson.decode(tracked_inserts_raw)
local new_tables = cjson.decode(new_tables_json)
local new_inserts = cjson.decode(new_inserts_json)

-- Count actually new tables
local added_creates = 0
local actual_new = {}
for _, tbl in ipairs(new_tables) do
    if not tracked_tables_set[tbl] then
        added_creates = added_creates + 1
        tracked_tables_set[tbl] = true
        table.insert(actual_new, tbl)
    end
end

-- Count added inserts (delta over previously tracked)
local added_inserts = 0
for tbl, count in pairs(new_inserts) do
    local prev = tracked_inserts[tbl] or 0
    if count > prev then
        added_inserts = added_inserts + (count - prev)
        tracked_inserts[tbl] = count
    end
end

-- Validate CREATE limit
if current_creates + added_creates > 5 then
    return {0, 'CREATE limit reached (5/5). Extend session or wait 1 hour.'}
end

-- Validate ROW OPS limit
local proposed_row_ops = added_inserts + dyn_updates + dyn_deletes
if current_row_ops + proposed_row_ops > 50 then
    local remaining = math.max(0, 50 - current_row_ops)
    return {0, 'Row operations limit reached (' .. (current_row_ops + proposed_row_ops) .. '/50). You only have ' .. remaining .. ' operations remaining.'}
end

-- Commit all changes atomically
if added_creates > 0 then
    -- Merge actual_new into tracked_tables_list
    for _, tbl in ipairs(actual_new) do
        table.insert(tracked_tables_list, tbl)
    end
    redis.call('HSET', key, 'tracked_tables', cjson.encode(tracked_tables_list))
    redis.call('HINCRBY', key, 'creates', added_creates)
end

if added_inserts > 0 then
    redis.call('HSET', key, 'tracked_inserts', cjson.encode(tracked_inserts))
    redis.call('HINCRBY', key, 'inserts', added_inserts)
end

if dyn_updates > 0 then
    redis.call('HINCRBY', key, 'updates', dyn_updates)
end

if dyn_deletes > 0 then
    redis.call('HINCRBY', key, 'deletes', dyn_deletes)
end

return {1, ''}
"""

# Script objects (loaded lazily)
_script_init = None
_script_extend = None
_script_commit = None

async def _get_scripts():
    global _script_init, _script_extend, _script_commit
    if not redis_client:
        raise RuntimeError("Redis client not initialized")
    if _script_init is None:
        _script_init = redis_client.register_script(_LUA_INIT_SESSION)
        _script_extend = redis_client.register_script(_LUA_EXTEND_SESSION)
        _script_commit = redis_client.register_script(_LUA_COMMIT_LIMITS)
    return _script_init, _script_extend, _script_commit

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_db_limits(session_id: str) -> dict:
    if not redis_client:
        return {"creates": 0, "inserts": 0, "extended_count": 0, "remaining_time": 0, "expired": True}
    
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
    
    current_inserts = int(data.get("inserts", 0))
    current_updates = int(data.get("updates", 0))
    current_deletes = int(data.get("deletes", 0))
    
    return {
        "creates": int(data.get("creates", 0)),
        "inserts": current_inserts + current_updates + current_deletes,  # Summed for frontend simplicity
        "extended_count": int(data.get("extended_count", 0)),
        "remaining_time": ttl if ttl > 0 else 0,
        "expired": ttl <= 0
    }

async def validate_session(session_id: str) -> bool:
    if not redis_client:
        return False
    key = f"temp_session:{session_id}"
    exists = await redis_client.exists(key)
    return bool(exists)

async def init_session(session_id: str) -> bool:
    if not redis_client:
        return False
    key = f"temp_session:{session_id}"
    now = int(datetime.now(timezone.utc).timestamp())
    
    script_init, _, _ = await _get_scripts()
    await script_init(keys=[key], args=[SESSION_TTL, now])
    return True

async def extend_session(session_id: str) -> tuple[bool, str, int]:
    if not redis_client:
        return False, "Redis unavailable.", 0
    
    key = f"temp_session:{session_id}"
    now = int(datetime.now(timezone.utc).timestamp())
    
    _, script_ext, _ = await _get_scripts()
    result = await script_ext(keys=[key], args=[SESSION_TTL, now])
    
    success = bool(result[0])
    msg = result[1] if isinstance(result[1], str) else result[1].decode() if hasattr(result[1], 'decode') else str(result[1])
    ttl = int(result[2]) if len(result) > 2 else 0
    
    return success, msg, ttl

async def check_and_commit_limits(session_id: str, new_tables: set, new_inserts: dict, dynamic_updates: int = 0, dynamic_deletes: int = 0) -> tuple[bool, str]:
    if not redis_client:
        return False, "Redis unavailable."
    
    if not new_tables and not new_inserts and dynamic_updates == 0 and dynamic_deletes == 0:
        return True, ""
    
    key = f"temp_session:{session_id}"
    
    # Convert set to sorted list for JSON serialization
    tables_list = sorted(list(new_tables)) if new_tables else []
    inserts_dict = new_inserts if new_inserts else {}
    
    _, _, script_commit = await _get_scripts()
    result = await script_commit(
        keys=[key],
        args=[
            json.dumps(tables_list),
            json.dumps(inserts_dict),
            dynamic_updates,
            dynamic_deletes,
        ]
    )
    
    success = bool(result[0])
    msg = result[1] if isinstance(result[1], str) else result[1].decode() if hasattr(result[1], 'decode') else str(result[1])
    
    return success, msg
