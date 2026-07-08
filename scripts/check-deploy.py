#!/usr/bin/env python3
"""Render.com da VibeShop backend deploy qilish uchun tayyorlov."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"

REQUIRED = ["BOT_TOKEN", "ADMIN_IDS"]
OPTIONAL = {
    "WEBAPP_URL": "https://vibe-shop-uz.netlify.app",
    "SUPPORT_USERNAME": "VibeShop_support",
    "PAYMENT_TIMEOUT_MINUTES": "5",
}


def main() -> int:
    print("=== VibeShop Render deploy tayyorligi ===\n")

    if not ENV_FILE.exists():
        print("XATO: .env fayl topilmadi!")
        print("  nusxa: copy .env.example .env")
        print("  keyin BOT_TOKEN va ADMIN_IDS ni to'ldiring")
        return 1

    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()

    missing = [k for k in REQUIRED if not env.get(k) or env[k].startswith("your_")]
    if missing:
        print(f"XATO: .env da to'ldiring: {', '.join(missing)}")
        return 1

    print("OK  .env to'ldirilgan")
    print(f"OK  WEBAPP_URL = {env.get('WEBAPP_URL', OPTIONAL['WEBAPP_URL'])}")
    print(f"OK  API manzil  = https://vibeshop-api.onrender.com")
    print()
    print("Render deploy qadamlari:")
    print("  1. GitHub: repo yarating va push qiling")
    print("  2. https://dashboard.render.com/select-repo?type=blueprint")
    print("  3. render.yaml ni tanlang")
    print("  4. Environment Variables:")
    for k in REQUIRED + list(OPTIONAL.keys()):
        val = env.get(k, OPTIONAL.get(k, ""))
        if k == "BOT_TOKEN":
            print(f"     {k} = ***")
        else:
            print(f"     {k} = {val}")
    print("  5. Deploy tugagach: /api/health tekshiring")
    print("  6. BotFather → Menu Button URL = https://vibe-shop.netlify.app")
    return 0


if __name__ == "__main__":
    sys.exit(main())
