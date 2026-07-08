import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from api.auth import is_admin_user, require_telegram_user
from api.admin_routes import router as admin_router
from config import UPLOADS_DIR, WEBAPP_DIR
from database.db import (
    confirm_card_to_card,
    create_order_from_balance,
    create_payment,
    get_or_create_user,
    get_payment,
    get_payment_settings,
    get_products,
    get_user_orders,
    get_user_payments,
    submit_screenshot,
)

app = FastAPI(title="VibeShop API", version="1.2.0")

app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class PaymentCreate(BaseModel):
    amount: int = Field(..., ge=1000)
    payment_method: str = Field(..., pattern="^(bankomat|card_to_card)$")
    purpose: str = Field(default="topup", pattern="^(topup|product)$")
    product_id: int | None = None


class ProductBuyBalance(BaseModel):
    product_id: int = Field(..., ge=1)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "VibeShop"}


@app.get("/api/products")
async def list_products(category: str | None = None):
    products = await get_products(category)
    return {"products": products, "count": len(products)}


@app.get("/api/payment/settings")
async def payment_settings():
    settings = await get_payment_settings()
    return {
        "card_number": settings.get("card_number", ""),
        "card_holder": settings.get("card_holder", ""),
        "bank_name": settings.get("bank_name", ""),
        "configured": bool(settings.get("card_number") and settings.get("card_holder")),
    }


@app.get("/api/user/me")
async def get_me(user: dict = Depends(require_telegram_user)):
    db_user = await get_or_create_user(
        telegram_id=user["id"],
        first_name=user.get("first_name", ""),
        last_name=user.get("last_name", ""),
        username=user.get("username", ""),
    )
    return {
        "id": db_user["telegram_id"],
        "first_name": db_user["first_name"],
        "last_name": db_user["last_name"],
        "username": db_user["username"],
        "balance": db_user["balance"],
        "photo_url": user.get("photo_url", ""),
        "is_admin": is_admin_user(user["id"]),
    }


@app.get("/api/user/history")
async def get_history(user: dict = Depends(require_telegram_user)):
    orders = await get_user_orders(user["id"])
    return {"history": orders, "count": len(orders)}


@app.get("/api/user/finance")
async def get_finance(user: dict = Depends(require_telegram_user)):
    payments = await get_user_payments(user["id"])
    return {"finance": payments, "count": len(payments)}


@app.post("/api/payments")
async def start_payment(
    payload: PaymentCreate,
    user: dict = Depends(require_telegram_user),
):
    amount = payload.amount
    if payload.purpose == "product":
        if not payload.product_id:
            raise HTTPException(status_code=400, detail="product_id required")
        from database.db import get_product

        product = await get_product(payload.product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        amount = product["price"]

    try:
        payment = await create_payment(
            telegram_id=user["id"],
            amount=amount,
            payment_method=payload.payment_method,
            purpose=payload.purpose,
            product_id=payload.product_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "payment_id": payment["id"],
        "amount": payment["amount"],
        "payment_method": payment["payment_method"],
        "purpose": payment["purpose"],
        "status": payment["status"],
        "expires_at": payment["expires_at"],
        "card_number": payment["card_number"],
        "card_holder": payment["card_holder"],
        "bank_name": payment.get("bank_name", ""),
        "order_id": payment.get("order_id"),
    }


@app.get("/api/payments/{payment_id}")
async def get_payment_status(
    payment_id: int,
    user: dict = Depends(require_telegram_user),
):
    payment = await get_payment(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db_user = await get_or_create_user(user["id"])
    if payment["user_id"] != db_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "payment_id": payment["id"],
        "amount": payment["amount"],
        "status": payment["status"],
        "payment_method": payment["payment_method"],
        "expires_at": payment["expires_at"],
    }


@app.post("/api/payments/{payment_id}/confirm")
async def confirm_payment(
    payment_id: int,
    user: dict = Depends(require_telegram_user),
):
    try:
        payment = await confirm_card_to_card(payment_id, user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db_user = await get_or_create_user(user["id"])
    return {
        "payment_id": payment["id"],
        "status": payment["status"],
        "balance": payment.get("new_balance", db_user["balance"]),
        "new_balance": payment.get("new_balance", db_user["balance"]),
    }


@app.post("/api/payments/{payment_id}/screenshot")
async def upload_screenshot(
    payment_id: int,
    user: dict = Depends(require_telegram_user),
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    ext = Path(file.filename or "screenshot.jpg").suffix or ".jpg"
    filename = f"{payment_id}_{uuid.uuid4().hex}{ext}"
    filepath = UPLOADS_DIR / filename

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    filepath.write_bytes(content)

    try:
        payment = await submit_screenshot(payment_id, user["id"], filename)
    except ValueError as exc:
        filepath.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    from bot.notifier import notify_admins_payment

    await notify_admins_payment(payment_id)

    return {
        "payment_id": payment["id"],
        "status": payment["status"],
        "message": "Screenshot uploaded. Admin will review shortly.",
    }


@app.post("/api/orders/balance")
async def buy_with_balance(
    payload: ProductBuyBalance,
    user: dict = Depends(require_telegram_user),
):
    try:
        order = await create_order_from_balance(user["id"], payload.product_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db_user = await get_or_create_user(user["id"])
    return {
        "order_id": order["id"],
        "product_name": order["product_name"],
        "amount": order["amount"],
        "status": order["status"],
        "balance": db_user["balance"],
    }


# Static uploads for admin review
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Static Mini App files (must be mounted last)
if WEBAPP_DIR.exists():
    app.mount("/", StaticFiles(directory=str(WEBAPP_DIR), html=True), name="webapp")
