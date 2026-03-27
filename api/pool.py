import os
import docker
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
}

cpu_quota = int(MAX_CPU * 100000)
cpu_period = 100000

pool = {lang: asyncio.Queue() for lang in LANGUAGES}

# Tmpfs settings for languages that compile or require db paths
TMPFS_MOUNTS = {
    "c": {"/tmp": "rw,exec,nosuid,size=64m"},
    "cpp": {"/tmp": "rw,exec,nosuid,size=64m"},
    "rust": {"/tmp": "rw,exec,nosuid,size=128m"},
    "go": {"/tmp": "rw,exec,nosuid,size=512m"},
    "java": {"/tmp": "rw,exec,nosuid,size=64m"},
    "typescript": {"/tmp": "rw,exec,nosuid,size=64m"},
    "mongodb": {"/tmp/mongo_data": "rw,exec,nosuid,size=128m"}
}

async def create_container_async(lang: str):
    loop = asyncio.get_running_loop()
    def _create():
        filename = f"/code/{LANGUAGES[lang]}"
        tmpfs = TMPFS_MOUNTS.get(lang, None)
        mem = MEM_OVERRIDES.get(lang, MAX_RAM)
        return docker_client.containers.create(
            image=f"runly-runner-{lang}",
            command=[filename],
            network_mode="none",
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            user="1000",
            mem_limit=mem,
            cpu_quota=cpu_quota,
            cpu_period=cpu_period,
            tty=True,
            stdin_open=True,
            detach=True,
            tmpfs=tmpfs
        )
    return await loop.run_in_executor(None, _create)

async def replenish_lang(lang: str, boot: bool = False):
    """
    Fills the pool for a specific language.
    If boot=True, it will not loop if an image is missing to prevent startup deadlock.
    """
    while pool[lang].qsize() < POOL_SIZE:
        try:
            container = await create_container_async(lang)
            await pool[lang].put(container)
        except Exception as e:
            logger.error(f"Failed forming {lang} pre-warm: {e}")
            if boot: break # Don't hang the entire API if one image is missing
            await asyncio.sleep(5) # Increase sleep to reduce log spam

async def replenish_task():
    while True:
        try:
            # Check all languages periodically
            for lang in LANGUAGES:
                if pool[lang].qsize() < POOL_SIZE:
                    asyncio.create_task(replenish_lang(lang))
        except Exception:
            pass
        await asyncio.sleep(10)

async def get_container(lang: str):
    if lang not in pool:
        raise ValueError(f"Language unsupported: {lang}")
    try:
        container = await asyncio.wait_for(pool[lang].get(), timeout=2.0)
        asyncio.create_task(replenish_lang(lang))
        return container
    except asyncio.TimeoutError:
        # If pool is empty, try to create one on the fly
        logger.warning(f"Pool empty for {lang}, creating on-the-fly...")
        return await create_container_async(lang)

async def initialize_pool():
    logger.info("Initializing container pool concurrently...")
    # Initialize all languages in parallel so missing images don't block boot
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
