import logging

import httpx

from bot.keyboards import admin_payment_keyboard
from config import ADMIN_IDS, BOT_TOKEN, UPLOADS_DIR, WEBAPP_URL
from database.db import get_payment_with_user

logger = logging.getLogger(__name__)

PURPOSE_LABELS = {"topup": "Пополнение", "product": "Покупка товара"}
METHOD_LABELS = {"bankomat": "🏧 Банкомат", "card_to_card": "💳 Карта-карта"}


async def notify_admins_payment(payment_id: int) -> None:
    if not BOT_TOKEN or not ADMIN_IDS:
        return

    payment = await get_payment_with_user(payment_id)
    if not payment:
        return

    text = (
        f"🔔 <b>Yangi to'lov #{payment_id}</b>\n\n"
        f"👤 {payment.get('first_name', '—')} (@{payment.get('username') or '—'})\n"
        f"🆔 TG: <code>{payment['telegram_id']}</code>\n"
        f"💰 {payment['amount']:,} so'm\n"
        f"📌 {PURPOSE_LABELS.get(payment['purpose'], payment['purpose'])}\n"
        f"💳 {METHOD_LABELS.get(payment['payment_method'], payment['payment_method'])}\n"
        f"⏳ {payment['status']}"
    )

    keyboard = {
        "inline_keyboard": [
            [
                {"text": "✅ Tasdiqlash", "callback_data": f"approve_pay:{payment_id}"},
                {"text": "❌ Rad etish", "callback_data": f"reject_pay:{payment_id}"},
            ]
        ]
    }

    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}"

    async with httpx.AsyncClient(timeout=30) as client:
        for admin_id in ADMIN_IDS:
            try:
                await client.post(
                    f"{api_url}/sendMessage",
                    json={
                        "chat_id": admin_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "reply_markup": keyboard,
                    },
                )

                if payment.get("screenshot_path"):
                    photo_path = UPLOADS_DIR / payment["screenshot_path"]
                    if photo_path.exists():
                        await client.post(
                            f"{api_url}/sendPhoto",
                            data={"chat_id": admin_id, "caption": f"To'lov #{payment_id} skrinshoti"},
                            files={"photo": photo_path.open("rb")},
                        )
            except Exception as exc:
                logger.warning("Admin notify failed for %s: %s", admin_id, exc)
