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
    "bash": "main.sh",
    "r": "main.R",
    "csharp": "main.csx",
    "ruby": "main.rb",
    "scala": "main.scala",
    "sqlite": "main.sql",
    "mongodb": "main.js"
}

POOL_SIZE = int(os.getenv("POOL_SIZE_PER_LANG", "3"))
MAX_RAM = os.getenv("MAX_RAM_PER_CONTAINER", "256m")
MAX_CPU = float(os.getenv("MAX_CPU_PER_CONTAINER", "0.5"))

cpu_quota = int(MAX_CPU * 100000)
cpu_period = 100000

pool = {lang: asyncio.Queue() for lang in LANGUAGES}

# Tmpfs settings for languages that compile or require db paths
TMPFS_MOUNTS = {
    "c": {"/tmp": "rw,exec,nosuid,size=64m"},
    "cpp": {"/tmp": "rw,exec,nosuid,size=64m"},
    "rust": {"/tmp": "rw,exec,nosuid,size=64m"},
    "go": {"/tmp": "rw,exec,nosuid,size=64m"},
    "scala": {"/tmp": "rw,exec,nosuid,size=64m"},
    "mongodb": {"/tmp/mongo_data": "rw,exec,nosuid,size=128m"}
}

async def create_container_async(lang: str):
    loop = asyncio.get_event_loop()
    def _create():
        filename = f"/code/{LANGUAGES[lang]}"
        tmpfs = TMPFS_MOUNTS.get(lang, None)
        return docker_client.containers.create(
            image=f"runly-runner-{lang}",
            command=[filename],
            network_mode="none",
            cap_drop=["ALL"],
            security_opt=["no-new-privileges"],
            user="1000",
            mem_limit=MAX_RAM,
            cpu_quota=cpu_quota,
            cpu_period=cpu_period,
            tty=True,
            stdin_open=True,
            detach=True,
            tmpfs=tmpfs
        )
    return await loop.run_in_executor(None, _create)

async def replenish_lang(lang: str):
    while pool[lang].qsize() < POOL_SIZE:
        try:
            container = await create_container_async(lang)
            await pool[lang].put(container)
        except Exception as e:
            logger.error(f"Failed forming {lang} pre-warm: {e}")
            await asyncio.sleep(2)

async def replenish_task():
    while True:
        try:
            tasks = [replenish_lang(lang) for lang in LANGUAGES]
            await asyncio.gather(*tasks)
        except Exception:
            pass
        await asyncio.sleep(1)

async def get_container(lang: str):
    if lang not in pool:
        raise ValueError(f"Language unsupported: {lang}")
    try:
        container = await asyncio.wait_for(pool[lang].get(), timeout=2.0)
        asyncio.create_task(replenish_lang(lang))
        return container
    except asyncio.TimeoutError:
        asyncio.create_task(replenish_lang(lang))
        return await create_container_async(lang)

async def initialize_pool():
    logger.info("Initializing container pool...")
    for lang in LANGUAGES:
        await replenish_lang(lang)
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
