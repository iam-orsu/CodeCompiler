import os
import docker
from docker.types import Ulimit
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

docker_client = docker.from_env()

LANGUAGES = {
    "python": "main.py",
    "javascript": "main.js",
    "typescript": "main.ts",
    "c": "main.c",
    "cpp": "main.cpp",
    "java": "Main.java",
    "go": "main.go",
    "rust": "main.rs",
    "php": "main.php",
    "r": "main.R",
    "csharp": "main.cs",
    "sqlite": "main.sql",
    "mongodb": "main.js"
}

POOL_SIZE = int(os.getenv("POOL_SIZE_PER_LANG", "3"))
MAX_RAM = os.getenv("MAX_RAM_PER_CONTAINER", "256m")
MAX_CPU = float(os.getenv("MAX_CPU_PER_CONTAINER", "0.5"))

# Per-language memory overrides for heavy compilers
MEM_OVERRIDES = {
    "go": "512m",
    "rust": "512m",
    "csharp": "512m",
    "java": "384m",
    "mongodb": "768m",
}

cpu_quota = int(MAX_CPU * 100000)
cpu_period = 100000

CPU_OVERRIDES = {
    "go": 1.0,
    "rust": 1.5,
    "csharp": 1.5
}

# Sandbox hardening constants
PIDS_LIMIT = 64  # Max processes per container (prevents fork bombs)
ULIMITS = [
    Ulimit(name='nofile', soft=256, hard=256),  # Max open file descriptors
]

pool = {lang: asyncio.Queue() for lang in LANGUAGES}
_replenish_active = {lang: False for lang in LANGUAGES}
# Limit concurrent on-the-fly container creation per language
MAX_ON_THE_FLY = 5
_on_the_fly_sem = {lang: asyncio.Semaphore(MAX_ON_THE_FLY) for lang in LANGUAGES}

# Default tmpfs for all languages
DEFAULT_TMPFS = {"/tmp": "rw,exec,nosuid,size=64m"}

# Tmpfs overrides for languages that need more space or custom paths
TMPFS_MOUNTS = {
    "c": {"/tmp": "rw,exec,nosuid,size=64m"},
    "cpp": {"/tmp": "rw,exec,nosuid,size=64m"},
    "rust": {"/tmp": "rw,exec,nosuid,size=128m"},
    "go": {"/tmp": "rw,exec,nosuid,size=512m,uid=1000,gid=1000"},
    "java": {"/tmp": "rw,exec,nosuid,size=64m"},
    "typescript": {"/tmp": "rw,exec,nosuid,size=64m"},
    "csharp": {"/tmp": "rw,exec,nosuid,size=128m"},
    "mongodb": {
        "/tmp": "rw,exec,nosuid,size=64m",
        "/tmp/mongo_data": "rw,exec,nosuid,size=512m,uid=1000,gid=1000",
    },
}

async def create_container_async(lang: str):
    loop = asyncio.get_running_loop()
    def _create():
        filename = f"/code/{LANGUAGES[lang]}"
        tmpfs = TMPFS_MOUNTS.get(lang, DEFAULT_TMPFS)
        mem = MEM_OVERRIDES.get(lang, MAX_RAM)
        quota = int(CPU_OVERRIDES.get(lang, MAX_CPU) * 100000)

        return docker_client.containers.create(
            image=f"runly-runner-{lang}",
            command=[filename],
            network_mode="none",
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            pids_limit=PIDS_LIMIT,
            ulimits=ULIMITS,
            user="1000",
            mem_limit=mem,
            cpu_quota=quota,
            cpu_period=cpu_period,
            tty=True,
            stdin_open=True,
            detach=True,
            tmpfs=tmpfs,
        )
    return await loop.run_in_executor(None, _create)

async def replenish_lang(lang: str, boot: bool = False):
    """
    Fills the pool for a specific language.
    If boot=True, it will not loop if an image is missing to prevent startup deadlock.
    """
    if _replenish_active[lang] and not boot:
        return  # Another replenish task is already running for this language
    _replenish_active[lang] = True
    try:
        while pool[lang].qsize() < POOL_SIZE:
            try:
                container = await create_container_async(lang)
                await pool[lang].put(container)
            except Exception as e:
                logger.error(f"Failed forming {lang} pre-warm: {e}")
                if boot: break  # Don't hang the entire API if one image is missing
                await asyncio.sleep(5)  # Increase sleep to reduce log spam
    finally:
        _replenish_active[lang] = False

async def replenish_task():
    while True:
        try:
            # Check all languages periodically
            for lang in LANGUAGES:
                if pool[lang].qsize() < POOL_SIZE:
                    asyncio.create_task(replenish_lang(lang))
        except Exception as e:
            logger.error(f"Replenish loop error: {e}")
        await asyncio.sleep(10)

async def get_container(lang: str):
    if lang not in pool:
        raise ValueError(f"Language unsupported: {lang}")
    try:
        container = await asyncio.wait_for(pool[lang].get(), timeout=2.0)
        asyncio.create_task(replenish_lang(lang))
        return container
    except asyncio.TimeoutError:
        # Pool empty - create on-the-fly with concurrency cap
        logger.warning(f"Pool empty for {lang}, creating on-the-fly...")
        try:
            await asyncio.wait_for(_on_the_fly_sem[lang].acquire(), timeout=10.0)
        except asyncio.TimeoutError:
            raise RuntimeError(f"Server overloaded for {lang}. Try again in a moment.")
        try:
            return await create_container_async(lang)
        finally:
            _on_the_fly_sem[lang].release()

async def initialize_pool():
    logger.info("Performing a Clean Slate flush of old containers...")
    def _flush():
        # Force-delete every runner container on the host before starting
        all_containers = docker_client.containers.list(all=True)
        for c in all_containers:
            image_tags = c.image.tags if c.image.tags else []
            if any("runly-runner-" in tag for tag in image_tags):
                try:
                    c.remove(force=True)
                except Exception:
                    pass
    
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _flush)
    
    logger.info("Initializing container pool concurrently...")
    # Initialize all languages in parallel
    tasks = [replenish_lang(lang, boot=True) for lang in LANGUAGES]
    await asyncio.gather(*tasks)
    asyncio.create_task(replenish_task())

async def cleanup_pool():
    logger.info("Cleaning up container pool...")
    for lang in LANGUAGES:
        while not pool[lang].empty():
            c = await pool[lang].get()
            try:
                c.remove(force=True)
            except Exception:
                pass
