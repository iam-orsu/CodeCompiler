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
from session_db import validate_session, init_session, check_and_commit_limits

load_dotenv()

# --- Parsing & Rewriting Utilities ---
def count_creates(code: str, lang: str) -> set:
    if lang == "sqlite":
        # Find all CREATE TABLE statements
        matches = re.findall(r"(?i)\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)", code)
        # Exclude pre-seeded tables
        return set(m.lower() for m in matches if m.lower() not in ["movies", "actors"])
    elif lang == "mongodb":
        # Find insertions or creations into new collections
        matches = re.findall(r"db\.([a-zA-Z0-9_]+)\.(insert|insertOne|insertMany|createCollection)", code)
        cols = set(m[0].lower() for m in matches if m[0].lower() not in ["movies", "actors"])
        return cols
    return set()

def count_inserts(code: str, lang: str) -> dict:
    from collections import defaultdict
    counts = defaultdict(int)
    
    if lang == "sqlite":
        statements = re.finditer(r"(?i)\bINSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\([^)]+\))?\s*VALUES\s*(.+?)(?:;|$)", code, re.DOTALL)
        for match in statements:
            table_name = match.group(1).lower()
            if table_name in ["movies", "actors"]:
                continue
            values_str = match.group(2)
            # Count the number of value groupings e.g., (1, 'A'), (2, 'B')
            rows = len(re.findall(r"\([^)]+\)", values_str))
            counts[table_name] += max(1, rows)
    elif lang == "mongodb":
        # insertOne
        ones = re.findall(r"db\.([a-zA-Z0-9_]+)\.insertOne\(", code)
        for t in ones:
            if t.lower() not in ["movies", "actors"]:
                counts[t.lower()] += 1
        
        # insertMany
        manys = re.finditer(r"db\.([a-zA-Z0-9_]+)\.insertMany\(\s*\[(.*?)\]\s*\)", code, re.DOTALL)
        for match in manys:
            col = match.group(1).lower()
            if col in ["movies", "actors"]:
                continue
            arr_contents = match.group(2)
            # Rough estimation of documents by counting '{'
            docs = arr_contents.count("{")
            counts[col] += max(1, docs)
            
        # insert (legacy, treat as many if array, else 1)
        inserts = re.finditer(r"db\.([a-zA-Z0-9_]+)\.insert\(\s*(\[.*?\]|\{.*?\})\s*\)", code, re.DOTALL)
        for match in inserts:
            col = match.group(1).lower()
            if col in ["movies", "actors"]:
                continue
            content = match.group(2)
            if content.startswith("["):
                docs = content.count("{")
                counts[col] += max(1, docs)
            else:
                counts[col] += 1
                
    return dict(counts)

def rewrite_queries(session_id: str, code: str, lang: str) -> str:
    if not session_id:
        return code
        
    prefix = f"temp_{session_id.replace('-', '')}_"
    
    if lang == "sqlite":
        # SQL keywords that should NEVER be treated as table names
        _SQL_RESERVED = {
            "create", "select", "insert", "update", "delete", "drop", "alter",
            "from", "where", "set", "values", "into", "table", "join", "on",
            "and", "or", "not", "null", "if", "exists", "primary", "key",
            "foreign", "index", "unique", "begin", "end", "commit", "rollback",
            "integer", "int", "text", "real", "blob", "varchar", "boolean",
            "autoincrement", "references", "check", "default", "having",
            "group", "order", "by", "limit", "offset", "union", "all",
            "distinct", "as", "like", "between", "in", "is", "case", "when",
            "then", "else", "asc", "desc", "count", "sum", "avg", "min", "max",
        }

        def sql_repl(match):
            keyword = match.group(1)
            middle = match.group(2) or ""
            identifier = match.group(3)
            if identifier.lower() in ["movies", "actors"]:
                return match.group(0)
            # Guard: don't prefix SQL keywords accidentally matched from comments
            if identifier.lower() in _SQL_RESERVED:
                return match.group(0)
            return f"{keyword}{middle}{prefix}{identifier}"
            
        # Match FROM, JOIN, INTO, TABLE, UPDATE followed by an optional IF NOT EXISTS, then the identifier
        pattern = r"(?i)\b(FROM|JOIN|INTO|TABLE|UPDATE)(\s+(?:IF\s+NOT\s+EXISTS\s+)?)([a-zA-Z0-9_]+)\b"
        return re.sub(pattern, sql_repl, code)
        
    elif lang == "mongodb":
        def mongo_repl(match):
            identifier = match.group(1)
            method = match.group(2)
            if identifier.lower() in ["movies", "actors"]:
                return match.group(0)
            return f"db.{prefix}{identifier}.{method}"
            
        pattern = r"db\.([a-zA-Z0-9_]+)\.(find|aggregate|insert|insertOne|insertMany|createCollection|update|updateOne|updateMany|delete|deleteOne|deleteMany|count|drop)"
        code = re.sub(pattern, mongo_repl, code)
        
        # Mongosh swallows cursor output in script mode. Auto-append print functions.
        def auto_print_cursors(tcode: str) -> str:
            idx = 0
            while True:
                idx_f = tcode.find(".find(", idx)
                idx_a = tcode.find(".aggregate(", idx)
                
                matches = [i for i in (idx_f, idx_a) if i != -1]
                if not matches:
                    break
                curr = min(matches)
                mlen = 6 if curr == idx_f else 11
                
                open_p = 0
                end_idx = -1
                for i in range(curr + mlen - 1, len(tcode)):
                    if tcode[i] == '(': open_p += 1
                    elif tcode[i] == ')':
                        open_p -= 1
                        if open_p == 0:
                            end_idx = i
                            break
                            
                if end_idx != -1:
                    after = tcode[end_idx+1:end_idx+15]
                    # Skip if user is natively handling the cursor
                    if not after.startswith(".toArray") and not after.startswith(".forEach") and not after.startswith(".pretty"):
                        insertion = ".forEach(printjson)"
                        tcode = tcode[:end_idx+1] + insertion + tcode[end_idx+1:]
                        idx = end_idx + 1 + len(insertion)
                    else:
                        idx = end_idx + 1
                else:
                    idx = curr + mlen
            return tcode
            
        return auto_print_cursors(code)
        
    return code

def check_unsafe_queries(code: str, lang: str) -> tuple[bool, str]:
    if lang == "sqlite":
        if re.search(r"(?i)\b(UPDATE|DELETE\s+FROM)\s+(movies|actors)\b", code):
            return False, "Cannot modify pre-seeded tables (movies, actors). Create your own tables instead."
            
        stmts = re.split(r";", code)
        for stmt in stmts:
            stmt = stmt.strip()
            if not stmt: continue
            is_update = re.search(r"(?i)\bUPDATE\s+", stmt) is not None
            is_delete = re.search(r"(?i)\bDELETE\s+FROM\s+", stmt) is not None
            
            if (is_update or is_delete) and not re.search(r"(?i)\bWHERE\s+", stmt):
                return False, "WHERE clause required for UPDATE and DELETE operations for safety."
    elif lang == "mongodb":
        if re.search(r"db\.(movies|actors)\.(update|delete)", code):
            return False, "Cannot modify pre-seeded tables (movies, actors). Create your own tables instead."
            
        if re.search(r"db\.[a-zA-Z0-9_]+\.deleteMany\(\s*(\{\s*\}|)\s*\)", code):
            return False, "Filter required for deleteMany for safety."
    return True, ""

def build_dry_run_code(code: str, lang: str) -> tuple[str, bool]:
    has_op = False
    if lang == "sqlite":
        def sql_repl(m):
            nonlocal has_op
            has_op = True
            op = m.group(1).upper()
            table = m.group(2)
            rest = m.group(3)
            # Find WHERE
            where_match = re.search(r"(?i)WHERE\s+(.+)$", rest)
            if where_match:
                where_clause = where_match.group(1)
                prefix = "DRYRUN_UPDATE" if op == "UPDATE" else "DRYRUN_DELETE"
                return f"SELECT '{prefix}=' || (SELECT COUNT(*) FROM {table} WHERE {where_clause});\n{m.group(0)}"
            return m.group(0)
            
        code = re.sub(r"(?i)\b(UPDATE)\s+([a-zA-Z0-9_]+)\s+(SET\s+.*?WHERE\s+.+?)(?:;|$)", sql_repl, code)
        code = re.sub(r"(?i)\b(DELETE\s+FROM)\s+([a-zA-Z0-9_]+)\s+(WHERE\s+.+?)(?:;|$)", sql_repl, code)
        
    elif lang == "mongodb":
        idx = 0
        while True:
            ops = {
                "updateOne": code.find(".updateOne(", idx),
                "updateMany": code.find(".updateMany(", idx),
                "deleteOne": code.find(".deleteOne(", idx),
                "deleteMany": code.find(".deleteMany(", idx),
            }
            valid_ops = {k: v for k, v in ops.items() if v != -1}
            if not valid_ops:
                break
                
            op_name = min(valid_ops, key=valid_ops.get)
            curr = valid_ops[op_name]
            op_len = len(op_name) + 2 # .method(
            
            open_p, open_b, filter_end = 1, 0, -1
            for i in range(curr + op_len, len(code)):
                c = code[i]
                if c == '{': open_b += 1
                elif c == '}': open_b -= 1
                elif c == '(': open_p += 1
                elif c == ')':
                    open_p -= 1
                    if open_p == 0 and open_b == 0:
                        filter_end = i
                        break
                elif c == ',' and open_b == 0 and open_p == 1:
                    filter_end = i
                    break
                    
            if filter_end != -1:
                filter_str = code[curr + op_len : filter_end].strip()
                if not filter_str: filter_str = "{}"
                if op_name in ["updateOne", "deleteOne"]:
                    metric = "UPDATE" if "update" in op_name else "DELETE"
                    ins = f"print('DRYRUN_{metric}=1');\n"
                    code = code[:curr] + ins + code[curr:]
                    idx = curr + len(ins) + len(op_name) + 4
                    has_op = True
                else:
                    metric = "UPDATE" if "update" in op_name else "DELETE"
                    col_start = code.rfind("db.", 0, curr)
                    if col_start != -1:
                        col_name = code[col_start+3:curr]
                        ins = f"print('DRYRUN_{metric}=' + db.{col_name}.countDocuments({filter_str}));\n"
                        code = code[:col_start] + ins + code[col_start:]
                        has_op = True
                        idx = col_start + len(ins) + len(op_name) + 4
                    else:
                        idx = curr + op_len
            else:
                idx = curr + op_len
                
    return code, has_op


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

async def run_headless_query(lang: str, dry_code: str) -> tuple[int, int]:
    try:
        from .pool import get_container
        container = await get_container(lang)
    except Exception as e:
        logger.error(f"Failed to get container for dry run: {e}")
        return 0, 0
        
    loop = asyncio.get_running_loop()
    filename = LANGUAGES[lang]
    tar_data = create_tar(filename, dry_code)
    try:
        await loop.run_in_executor(None, lambda: container.put_archive("/code", tar_data))
        await loop.run_in_executor(None, container.start)
        await loop.run_in_executor(None, container.wait)
        out = await loop.run_in_executor(None, lambda: container.logs(stdout=True, stderr=True))
        out_str = out.decode('utf-8', errors='replace')
        
        updates, deletes = 0, 0
        for line in out_str.split('\n'):
            if "DRYRUN_UPDATE=" in line:
                try: updates += int(re.search(r"DRYRUN_UPDATE=(\d+)", line).group(1))
                except: pass
            elif "DRYRUN_DELETE=" in line:
                try: deletes += int(re.search(r"DRYRUN_DELETE=(\d+)", line).group(1))
                except: pass
                
        return updates, deletes
    except Exception as e:
        logger.error(f"Dry run execution error: {e}")
        return 0, 0
    finally:
        asyncio.create_task(cleanup_container(container))

async def execute_code(ws: WebSocket, lang: str, code: str, session_id: str = None):
    if lang not in LANGUAGES:
        await ws.send_json({"type": "stderr", "data": f"Unsupported language: {lang}\n"})
        return
        
    # --- Session Quota Management ---
    if lang in ["sqlite", "mongodb"]:
        if not session_id:
            await ws.send_json({"type": "stderr", "data": "Session ID required for database execution.\n"})
            await ws.send_json({"type": "exit", "data": 1})
            return
            
        valid = await validate_session(session_id)
        if not valid:
            # Initialize if they just refreshed or first load
            await init_session(session_id)
            
        safe, err_msg = check_unsafe_queries(code, lang)
        if not safe:
            await ws.send_json({"type": "stderr", "data": err_msg + "\n"})
            await ws.send_json({"type": "exit", "data": 1})
            return
            
        new_creates = count_creates(code, lang)
        new_inserts = count_inserts(code, lang)
        
        rewritten_for_dry = rewrite_queries(session_id, code, lang)
        dry_code, has_ops = build_dry_run_code(rewritten_for_dry, lang)
        
        dynamic_updates, dynamic_deletes = 0, 0
        if has_ops:
            dynamic_updates, dynamic_deletes = await run_headless_query(lang, dry_code)
        
        success, err_msg = await check_and_commit_limits(session_id, new_creates, new_inserts, dynamic_updates, dynamic_deletes)
        if not success:
            await ws.send_json({"type": "stderr", "data": err_msg + "\n"})
            await ws.send_json({"type": "exit", "data": 1})
            return
            
        code = rewritten_for_dry
    # --------------------------------


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

