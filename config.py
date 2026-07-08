import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
WEBAPP_DIR = BASE_DIR / "webapp"
DATABASE_PATH = BASE_DIR / "data" / "vibeshop.db"

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://vibe-shop-uz.netlify.app")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "8080")))
SUPPORT_USERNAME = os.getenv("SUPPORT_USERNAME", "support")

# Admin Telegram IDs (comma-separated), e.g. "123456789,987654321"
ADMIN_IDS: list[int] = [
    int(x.strip())
    for x in os.getenv("ADMIN_IDS", "").split(",")
    if x.strip().isdigit()
]

UPLOADS_DIR = BASE_DIR / "data" / "uploads"
PAYMENT_TIMEOUT_MINUTES = int(os.getenv("PAYMENT_TIMEOUT_MINUTES", "5"))

# Payment cards (seeded to DB on startup)
CARD_NUMBER = os.getenv("CARD_NUMBER", "")
CARD_HOLDER = os.getenv("CARD_HOLDER", "")
CARD_BANK = os.getenv("CARD_BANK", "UzCard")
CARD_NUMBER_VISA = os.getenv("CARD_NUMBER_VISA", "")
CARD_HOLDER_VISA = os.getenv("CARD_HOLDER_VISA", "")
CARD_BANK_VISA = os.getenv("CARD_BANK_VISA", "Visa")

# O'yinchi ID tekshiruv (provider URL: {player_id} yoki {uid})
GAME_VERIFY_URLS: dict[str, str] = {
    "freefire": os.getenv("FREEFIRE_VERIFY_URL", ""),
    "pubg": os.getenv("PUBG_VERIFY_URL", ""),
    "bloodstrike": os.getenv("BLOODSTRIKE_VERIFY_URL", ""),
    "magicchess": os.getenv("MAGICCHESS_VERIFY_URL", ""),
    "deltaforce": os.getenv("DELTA_FORCE_VERIFY_URL", ""),
    "shootloot": os.getenv("SHOOTLOOT_VERIFY_URL", ""),
    "standoff2": os.getenv("STANDOFF2_VERIFY_URL", ""),
}
HLGAMING_API_KEY = os.getenv("HLGAMING_API_KEY", "")
HLGAMING_USERUID = os.getenv("HLGAMING_USERUID", "")
FFDATA_API_KEY = os.getenv("FFDATA_API_KEY", "")
FFDATA_API_BASE = os.getenv("FFDATA_API_BASE", "https://ffdata-api.onrender.com").rstrip("/")
FREEFIRE_REGION = os.getenv("FREEFIRE_REGION", "RU")

# Dev/test: {"freefire":{"637195216":"X Eclipse"}}
try:
    GAME_VERIFY_OVERRIDES: dict[str, dict[str, str]] = json.loads(
        os.getenv("GAME_VERIFY_OVERRIDES", "{}")
    )
except json.JSONDecodeError:
    GAME_VERIFY_OVERRIDES = {}

# Production: frontend Netlify'da — static serve kerak emas (POST /api 405 oldini oladi)
SERVE_WEBAPP = os.getenv("SERVE_WEBAPP", "false").lower() in ("1", "true", "yes")
