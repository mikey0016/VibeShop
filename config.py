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
