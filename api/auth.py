import hashlib
import hmac
import json
from urllib.parse import parse_qsl, unquote

from fastapi import Depends, Header, HTTPException

from config import ADMIN_IDS, BOT_TOKEN


def is_admin_user(telegram_id: int) -> bool:
    return telegram_id in ADMIN_IDS


def validate_init_data(init_data: str) -> dict:
    """Validate Telegram WebApp initData and return parsed user payload."""
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram init data")

    if not BOT_TOKEN:
        # Dev mode without token — parse without validation
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        user_raw = parsed.get("user")
        if user_raw:
            parsed["user"] = json.loads(unquote(user_raw))
        return parsed

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Invalid init data")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="Init data validation failed")

    user_raw = parsed.get("user")
    if user_raw:
        parsed["user"] = json.loads(unquote(user_raw))
    return parsed


def get_telegram_user(init_data: str) -> dict:
    parsed = validate_init_data(init_data)
    user = parsed.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="User not found in init data")
    return user


async def require_telegram_user(
    x_telegram_init_data: str | None = Header(default=None, alias="X-Telegram-Init-Data"),
) -> dict:
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="X-Telegram-Init-Data header required")
    return get_telegram_user(x_telegram_init_data)


async def require_admin(
    user: dict = Depends(require_telegram_user),
) -> dict:
    if not is_admin_user(user["id"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
