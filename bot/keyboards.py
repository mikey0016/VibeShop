from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import WEBAPP_URL


def main_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="🛍️ Открыть магазин",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ],
            [
                InlineKeyboardButton(text="📋 Мои заказы", callback_data="orders"),
                InlineKeyboardButton(text="💬 Поддержка", callback_data="support"),
            ],
        ]
    )


def admin_payment_keyboard(payment_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"approve_pay:{payment_id}"),
                InlineKeyboardButton("❌ Rad etish", callback_data=f"reject_pay:{payment_id}"),
            ]
        ]
    )
