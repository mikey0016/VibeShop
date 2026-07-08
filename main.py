"""VibeShop — Telegram Mini App digital goods store."""

import asyncio
import logging
import sys

from uvicorn import Config, Server

from bot.handlers import build_bot_application
from config import API_HOST, API_PORT, BOT_TOKEN
from database.db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("vibeshop")


async def run_api() -> None:
    config = Config(
        "api.app:app",
        host=API_HOST,
        port=API_PORT,
        log_level="info",
        reload=False,
    )
    server = Server(config)
    await server.serve()


async def run_bot() -> None:
    application = build_bot_application()
    if application is None:
        logger.warning("BOT_TOKEN not set — bot polling disabled")
        return

    logger.info("Starting Telegram bot polling...")
    await application.initialize()
    await application.start()
    await application.updater.start_polling(drop_pending_updates=True)

    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()


async def main() -> None:
    logger.info("Initializing database...")
    await init_db()

    logger.info("VibeShop starting on http://%s:%s", API_HOST, API_PORT)
    await asyncio.gather(run_api(), run_bot())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("VibeShop stopped")
