import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes, MessageHandler, filters

from bot.keyboards import main_menu_keyboard
from config import ADMIN_IDS, BOT_TOKEN, SUPPORT_USERNAME
from database.db import (
    approve_payment,
    get_or_create_user,
    get_payment_with_user,
    get_user_orders,
    reject_payment,
    update_payment_settings,
)

logger = logging.getLogger(__name__)

PURPOSE_LABELS = {"topup": "Пополнение", "product": "Покупка товара"}
METHOD_LABELS = {"bankomat": "🏧 Банкомат", "card_to_card": "💳 Карта-карта"}


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if user:
        await get_or_create_user(
            telegram_id=user.id,
            first_name=user.first_name or "",
            last_name=user.last_name or "",
            username=user.username or "",
        )

    await update.message.reply_text(
        "👋 Добро пожаловать в <b>VibeShop</b>!\n\n"
        "🎁 Telegram подарки · ⭐ Premium · ✨ Stars\n"
        "🎮 PUBG UC · 💎 Free Fire Diamonds\n\n"
        "Нажмите кнопку ниже, чтобы открыть магазин:",
        reply_markup=main_menu_keyboard(),
        parse_mode="HTML",
    )


async def cmd_setcard(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user or not is_admin(user.id):
        await update.message.reply_text("⛔ Faqat admin uchun.")
        return

    if len(context.args) < 2:
        await update.message.reply_text(
            "📝 Foydalanish:\n"
            "<code>/setcard 9860123456789012 Alisher Karimov</code>\n\n"
            "Bank nomi (ixtiyoriy):\n"
            "<code>/setcard 9860123456789012 Alisher Karimov UzCard</code>",
            parse_mode="HTML",
        )
        return

    card_number = context.args[0]
    card_holder = context.args[1]
    bank_name = context.args[2] if len(context.args) > 2 else ""

    settings = await update_payment_settings(card_number, card_holder, bank_name)
    await update.message.reply_text(
        "✅ <b>To'lov kartasi yangilandi</b>\n\n"
        f"💳 Karta: <code>{settings['card_number']}</code>\n"
        f"👤 Egasi: {settings['card_holder']}\n"
        f"🏦 Bank: {settings.get('bank_name') or '—'}",
        parse_mode="HTML",
    )


async def cmd_approve(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user or not is_admin(user.id):
        await update.message.reply_text("⛔ Faqat admin uchun.")
        return

    if not context.args:
        await update.message.reply_text("Foydalanish: <code>/approve 123</code>", parse_mode="HTML")
        return

    payment_id = int(context.args[0])
    try:
        payment = await approve_payment(payment_id)
    except ValueError as exc:
        await update.message.reply_text(f"❌ {exc}")
        return

    payment_info = await get_payment_with_user(payment_id)
    if payment_info:
        try:
            await context.bot.send_message(
                chat_id=payment_info["telegram_id"],
                text=(
                    f"✅ <b>To'lov #{payment_id} tasdiqlandi!</b>\n\n"
                    f"💰 Summa: {payment_info['amount']:,} so'm\n"
                    + (
                        f"💳 Yangi balans: {payment.get('new_balance', 0):,} so'm"
                        if payment_info["purpose"] == "topup"
                        else "📦 Buyurtmangiz qayta ishlanmoqda."
                    )
                ),
                parse_mode="HTML",
            )
        except Exception:
            pass

    await update.message.reply_text(f"✅ To'lov #{payment_id} tasdiqlandi.")


async def cmd_reject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user or not is_admin(user.id):
        await update.message.reply_text("⛔ Faqat admin uchun.")
        return

    if not context.args:
        await update.message.reply_text("Foydalanish: <code>/reject 123</code>", parse_mode="HTML")
        return

    payment_id = int(context.args[0])
    try:
        await reject_payment(payment_id)
    except ValueError as exc:
        await update.message.reply_text(f"❌ {exc}")
        return

    payment_info = await get_payment_with_user(payment_id)
    if payment_info:
        try:
            await context.bot.send_message(
                chat_id=payment_info["telegram_id"],
                text=f"❌ To'lov #{payment_id} rad etildi. Qo'llab-quvvatlashga murojaat qiling.",
            )
        except Exception:
            pass

    await update.message.reply_text(f"❌ To'lov #{payment_id} rad etildi.")


async def callback_admin_payment(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    user = update.effective_user
    if not query or not user or not is_admin(user.id):
        await query.answer("⛔ Faqat admin", show_alert=True)
        return

    action, payment_id_str = query.data.split(":", 1)
    payment_id = int(payment_id_str)

    if action == "approve_pay":
        try:
            payment = await approve_payment(payment_id)
        except ValueError as exc:
            await query.answer(str(exc), show_alert=True)
            return

        payment_info = await get_payment_with_user(payment_id)
        if payment_info:
            try:
                await context.bot.send_message(
                    chat_id=payment_info["telegram_id"],
                    text=(
                        f"✅ <b>To'lov #{payment_id} tasdiqlandi!</b>\n\n"
                        f"💰 {payment_info['amount']:,} so'm"
                    ),
                    parse_mode="HTML",
                )
            except Exception:
                pass

        await query.edit_message_text(
            (query.message.text or "") + "\n\n✅ Tasdiqlandi",
        )
        await query.answer("Tasdiqlandi")

    elif action == "reject_pay":
        await reject_payment(payment_id)
        payment_info = await get_payment_with_user(payment_id)
        if payment_info:
            try:
                await context.bot.send_message(
                    chat_id=payment_info["telegram_id"],
                    text=f"❌ To'lov #{payment_id} rad etildi.",
                )
            except Exception:
                pass

        await query.edit_message_text(
            (query.message.text or "") + "\n\n❌ Rad etildi",
        )
        await query.answer("Rad etildi")


async def callback_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    user = update.effective_user
    if not query or not user:
        return

    orders = await get_user_orders(user.id)
    if not orders:
        await query.message.reply_text("📋 У вас пока нет заказов.")
        await query.answer()
        return

    status_icons = {"success": "✅", "pending": "⏳", "failed": "❌"}
    lines = ["📋 <b>Ваши заказы:</b>\n"]
    for order in orders[:10]:
        icon = status_icons.get(order["status"], "•")
        lines.append(
            f"{icon} #{order['id']} — {order['product_name']}\n"
            f"   {order['amount']:,} сум · {order['date']}"
        )

    await query.message.reply_text("\n".join(lines), parse_mode="HTML")
    await query.answer()


async def callback_support(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query:
        return
    await query.message.reply_text(
        f"💬 Поддержка: @{SUPPORT_USERNAME}\n"
        "Напишите нам, если возникли вопросы по заказу."
    )
    await query.answer()


def build_bot_application() -> Application | None:
    if not BOT_TOKEN:
        return None

    app = Application.builder().token(BOT_TOKEN).build()
    app.bot_data["uploads_dir"] = str(__import__("config").UPLOADS_DIR)

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("setcard", cmd_setcard))
    app.add_handler(CommandHandler("approve", cmd_approve))
    app.add_handler(CommandHandler("reject", cmd_reject))
    app.add_handler(CallbackQueryHandler(callback_orders, pattern="^orders$"))
    app.add_handler(CallbackQueryHandler(callback_support, pattern="^support$"))
    app.add_handler(CallbackQueryHandler(callback_admin_payment, pattern="^(approve_pay|reject_pay):"))
    return app
