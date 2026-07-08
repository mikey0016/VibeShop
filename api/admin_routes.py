from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.auth import is_admin_user, require_admin, require_telegram_user
from database.db import (
    approve_payment,
    get_admin_stats,
    get_all_orders,
    get_all_payments,
    get_all_users,
    get_payment_settings,
    reject_payment,
    update_payment_settings,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class PaymentSettingsUpdate(BaseModel):
    card_number: str = Field(..., min_length=8, max_length=32)
    card_holder: str = Field(..., min_length=2, max_length=64)
    bank_name: str = Field(default="", max_length=32)


@router.get("/check")
async def admin_check(user: dict = Depends(require_telegram_user)):
    return {"is_admin": is_admin_user(user["id"])}


@router.get("/stats")
async def admin_stats(_admin: dict = Depends(require_admin)):
    stats = await get_admin_stats()
    return stats


@router.get("/payments")
async def admin_payments(
    status: str | None = None,
    _admin: dict = Depends(require_admin),
):
    payments = await get_all_payments(status=status)
    return {"payments": payments, "count": len(payments)}


@router.post("/payments/{payment_id}/approve")
async def admin_approve_payment(
    payment_id: int,
    _admin: dict = Depends(require_admin),
):
    try:
        payment = await approve_payment(payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"payment_id": payment_id, "status": payment["status"], "new_balance": payment.get("new_balance")}


@router.post("/payments/{payment_id}/reject")
async def admin_reject_payment(
    payment_id: int,
    _admin: dict = Depends(require_admin),
):
    try:
        payment = await reject_payment(payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"payment_id": payment_id, "status": payment["status"]}


@router.get("/orders")
async def admin_orders(_admin: dict = Depends(require_admin)):
    orders = await get_all_orders()
    return {"orders": orders, "count": len(orders)}


@router.get("/users")
async def admin_users(_admin: dict = Depends(require_admin)):
    users = await get_all_users()
    return {"users": users, "count": len(users)}


@router.get("/settings/payment")
async def admin_get_payment_settings(_admin: dict = Depends(require_admin)):
    settings = await get_payment_settings()
    return settings


@router.put("/settings/payment")
async def admin_update_payment_settings(
    payload: PaymentSettingsUpdate,
    _admin: dict = Depends(require_admin),
):
    settings = await update_payment_settings(
        payload.card_number,
        payload.card_holder,
        payload.bank_name,
    )
    return settings
