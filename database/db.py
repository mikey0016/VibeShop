import aiosqlite
from datetime import datetime, timedelta, timezone

from config import DATABASE_PATH, PAYMENT_TIMEOUT_MINUTES, CARD_NUMBER, CARD_HOLDER, CARD_BANK
from database.seed import PRODUCTS


async def init_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL,
                first_name TEXT NOT NULL DEFAULT '',
                last_name TEXT NOT NULL DEFAULT '',
                username TEXT NOT NULL DEFAULT '',
                balance INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                category TEXT NOT NULL,
                price INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                payment_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS payment_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                card_number TEXT NOT NULL DEFAULT '',
                card_holder TEXT NOT NULL DEFAULT '',
                bank_name TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL,
                purpose TEXT NOT NULL DEFAULT 'topup',
                product_id INTEGER,
                order_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                screenshot_path TEXT,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )
        await db.commit()

        # Migrate existing orders table
        cursor = await db.execute("PRAGMA table_info(orders)")
        columns = {row[1] for row in await cursor.fetchall()}
        if "payment_id" not in columns:
            await db.execute("ALTER TABLE orders ADD COLUMN payment_id INTEGER")
        if "player_id" not in columns:
            await db.execute("ALTER TABLE orders ADD COLUMN player_id TEXT")
        if "player_nickname" not in columns:
            await db.execute("ALTER TABLE orders ADD COLUMN player_nickname TEXT")

        await db.execute(
            """
            INSERT OR IGNORE INTO payment_settings (id, card_number, card_holder, bank_name)
            VALUES (1, '', '', '')
            """
        )
        await db.commit()

    if CARD_NUMBER and CARD_HOLDER:
        await update_payment_settings(CARD_NUMBER, CARD_HOLDER, CARD_BANK)

    await seed_products()


async def seed_products() -> None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        for p in PRODUCTS:
            await db.execute(
                """
                INSERT INTO products (id, name, emoji, category, price)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    emoji = excluded.emoji,
                    category = excluded.category,
                    price = excluded.price
                """,
                (p["id"], p["name"], p["emoji"], p["category"], p["price"]),
            )
        await db.commit()


async def get_or_create_user(
    telegram_id: int,
    first_name: str = "",
    last_name: str = "",
    username: str = "",
) -> dict:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (telegram_id,),
        )
        row = await cursor.fetchone()

        if row:
            await db.execute(
                """
                UPDATE users
                SET first_name = ?, last_name = ?, username = ?
                WHERE telegram_id = ?
                """,
                (first_name, last_name, username, telegram_id),
            )
            await db.commit()
            cursor = await db.execute(
                "SELECT * FROM users WHERE telegram_id = ?",
                (telegram_id,),
            )
            row = await cursor.fetchone()
            return dict(row)

        await db.execute(
            """
            INSERT INTO users (telegram_id, first_name, last_name, username, balance)
            VALUES (?, ?, ?, ?, 0)
            """,
            (telegram_id, first_name, last_name, username),
        )
        await db.commit()
        cursor = await db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (telegram_id,),
        )
        row = await cursor.fetchone()
        return dict(row)


async def get_products(category: str | None = None) -> list[dict]:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        if category and category != "all":
            cursor = await db.execute(
                "SELECT * FROM products WHERE category = ? ORDER BY id",
                (category,),
            )
        else:
            cursor = await db.execute("SELECT * FROM products ORDER BY id")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_product(product_id: int) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_payment_settings() -> dict:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM payment_settings WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row) if row else {"card_number": "", "card_holder": "", "bank_name": ""}


async def update_payment_settings(card_number: str, card_holder: str, bank_name: str = "") -> dict:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            """
            INSERT INTO payment_settings (id, card_number, card_holder, bank_name, updated_at)
            VALUES (1, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                card_number = excluded.card_number,
                card_holder = excluded.card_holder,
                bank_name = excluded.bank_name,
                updated_at = datetime('now')
            """,
            (card_number, card_holder, bank_name),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM payment_settings WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row)


def _expires_at_iso() -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=PAYMENT_TIMEOUT_MINUTES)
    return expires.strftime("%Y-%m-%d %H:%M:%S")


async def create_payment(
    telegram_id: int,
    amount: int,
    payment_method: str,
    purpose: str = "topup",
    product_id: int | None = None,
    player_id: str | None = None,
    player_nickname: str | None = None,
) -> dict:
    settings = await get_payment_settings()
    if not settings.get("card_number") or not settings.get("card_holder"):
        raise ValueError("Payment card not configured")

    if payment_method not in {"bankomat", "card_to_card"}:
        raise ValueError("Invalid payment method")

    user = await get_or_create_user(telegram_id)
    expires_at = _expires_at_iso()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            INSERT INTO payments (user_id, amount, payment_method, purpose, product_id, status, expires_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
            """,
            (user["id"], amount, payment_method, purpose, product_id, expires_at),
        )
        await db.commit()
        payment_id = cursor.lastrowid

        order_id = None
        if purpose == "product" and product_id:
            product = await get_product(product_id)
            if not product:
                raise ValueError("Product not found")
            if product["price"] != amount:
                amount = product["price"]

            order_cursor = await db.execute(
                """
                INSERT INTO orders (user_id, product_id, product_name, amount, payment_method, status, payment_id, player_id, player_nickname)
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                """,
                (user["id"], product["id"], product["name"], product["price"], payment_method, payment_id, player_id, player_nickname),
            )
            order_id = order_cursor.lastrowid
            await db.execute(
                "UPDATE payments SET order_id = ? WHERE id = ?",
                (order_id, payment_id),
            )
            await db.commit()

        cursor = await db.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        payment = dict(await cursor.fetchone())
        payment["card_number"] = settings["card_number"]
        payment["card_holder"] = settings["card_holder"]
        payment["bank_name"] = settings.get("bank_name", "")
        payment["order_id"] = order_id
        return payment


async def get_payment(payment_id: int) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_payment_with_user(payment_id: int) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT p.*, u.telegram_id, u.first_name, u.username
            FROM payments p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = ?
            """,
            (payment_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def is_payment_expired(payment: dict) -> bool:
    expires = datetime.strptime(payment["expires_at"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expires


async def submit_screenshot(payment_id: int, telegram_id: int, screenshot_path: str) -> dict:
    payment = await get_payment(payment_id)
    if not payment:
        raise ValueError("Payment not found")

    user = await get_or_create_user(telegram_id)
    if payment["user_id"] != user["id"]:
        raise ValueError("Access denied")

    if payment["status"] != "pending":
        raise ValueError("Payment already processed")

    if await is_payment_expired(payment):
        await update_payment_status(payment_id, "expired")
        raise ValueError("Payment time expired")

    if payment["payment_method"] != "bankomat":
        raise ValueError("Screenshot only for bankomat payments")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            """
            UPDATE payments
            SET screenshot_path = ?, status = 'awaiting_admin'
            WHERE id = ?
            """,
            (screenshot_path, payment_id),
        )
        if payment.get("order_id"):
            await db.execute(
                "UPDATE orders SET status = 'pending' WHERE id = ?",
                (payment["order_id"],),
            )
        await db.commit()
        cursor = await db.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        return dict(await cursor.fetchone())


async def confirm_card_to_card(payment_id: int, telegram_id: int) -> dict:
    payment = await get_payment(payment_id)
    if not payment:
        raise ValueError("Payment not found")

    user = await get_or_create_user(telegram_id)
    if payment["user_id"] != user["id"]:
        raise ValueError("Access denied")

    if payment["status"] != "pending":
        raise ValueError("Payment already processed")

    if await is_payment_expired(payment):
        await update_payment_status(payment_id, "expired")
        raise ValueError("Payment time expired")

    if payment["payment_method"] != "card_to_card":
        raise ValueError("Auto confirm only for card_to_card")

    return await approve_payment(payment_id, auto=True)


async def approve_payment(payment_id: int, auto: bool = False) -> dict:
    payment = await get_payment(payment_id)
    if not payment:
        raise ValueError("Payment not found")

    if payment["status"] in {"success", "failed", "expired"}:
        raise ValueError("Payment already finalized")

    if not auto and payment["payment_method"] == "bankomat" and payment["status"] != "awaiting_admin":
        raise ValueError("Waiting for screenshot")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        if payment["purpose"] == "topup":
            await db.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                (payment["amount"], payment["user_id"]),
            )
        elif payment["purpose"] == "product" and payment.get("order_id"):
            await db.execute(
                "UPDATE orders SET status = 'success' WHERE id = ?",
                (payment["order_id"],),
            )

        await db.execute(
            "UPDATE payments SET status = 'success' WHERE id = ?",
            (payment_id,),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        updated = dict(await cursor.fetchone())

        cursor = await db.execute(
            "SELECT balance FROM users WHERE id = ?",
            (payment["user_id"],),
        )
        balance_row = await cursor.fetchone()
        updated["new_balance"] = balance_row[0] if balance_row else 0
        return updated


async def reject_payment(payment_id: int) -> dict:
    payment = await get_payment(payment_id)
    if not payment:
        raise ValueError("Payment not found")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            "UPDATE payments SET status = 'failed' WHERE id = ?",
            (payment_id,),
        )
        if payment.get("order_id"):
            await db.execute(
                "UPDATE orders SET status = 'failed' WHERE id = ?",
                (payment["order_id"],),
            )
        await db.commit()
        cursor = await db.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        return dict(await cursor.fetchone())


async def update_payment_status(payment_id: int, status: str) -> None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE payments SET status = ? WHERE id = ?",
            (status, payment_id),
        )
        await db.commit()


async def add_user_balance(telegram_id: int, amount: int) -> int:
    user = await get_or_create_user(telegram_id)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            (amount, user["id"]),
        )
        await db.commit()
        cursor = await db.execute(
            "SELECT balance FROM users WHERE id = ?",
            (user["id"],),
        )
        row = await cursor.fetchone()
        return row[0] if row else 0


async def create_order_from_balance(
    telegram_id: int,
    product_id: int,
    player_id: str | None = None,
    player_nickname: str | None = None,
) -> dict:
    user = await get_or_create_user(telegram_id)
    product = await get_product(product_id)
    if not product:
        raise ValueError("Product not found")

    if user["balance"] < product["price"]:
        raise ValueError("Insufficient balance")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ?",
            (product["price"], user["id"]),
        )
        cursor = await db.execute(
            """
            INSERT INTO orders (user_id, product_id, product_name, amount, payment_method, status, player_id, player_nickname)
            VALUES (?, ?, ?, ?, 'balance', 'success', ?, ?)
            """,
            (user["id"], product["id"], product["name"], product["price"], player_id, player_nickname),
        )
        await db.commit()
        order_id = cursor.lastrowid
        cursor = await db.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        return dict(await cursor.fetchone())


async def get_user_orders(telegram_id: int) -> list[dict]:
    user = await get_or_create_user(telegram_id)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, product_name, amount, status,
                   strftime('%d.%m.%Y', created_at) AS date
            FROM orders
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user["id"],),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_user_payments(telegram_id: int) -> list[dict]:
    user = await get_or_create_user(telegram_id)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, amount, payment_method, purpose, status,
                   strftime('%d.%m.%Y %H:%M', created_at) AS date
            FROM payments
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user["id"],),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_user_by_telegram_id(telegram_id: int) -> dict | None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (telegram_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_admin_stats() -> dict:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        users = (await (await db.execute("SELECT COUNT(*) FROM users")).fetchone())[0]
        orders = (await (await db.execute("SELECT COUNT(*) FROM orders")).fetchone())[0]
        pending = (await (await db.execute(
            "SELECT COUNT(*) FROM payments WHERE status IN ('pending', 'awaiting_admin')"
        )).fetchone())[0]
        revenue = (await (await db.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success'"
        )).fetchone())[0]
        success_orders = (await (await db.execute(
            "SELECT COUNT(*) FROM orders WHERE status = 'success'"
        )).fetchone())[0]
        return {
            "users_count": users,
            "orders_count": orders,
            "pending_payments": pending,
            "total_revenue": revenue,
            "success_orders": success_orders,
        }


async def get_all_payments(status: str | None = None, limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        if status:
            cursor = await db.execute(
                """
                SELECT p.*, u.telegram_id, u.first_name, u.username,
                       strftime('%d.%m.%Y %H:%M', p.created_at) AS date
                FROM payments p
                JOIN users u ON u.id = p.user_id
                WHERE p.status = ?
                ORDER BY p.id DESC LIMIT ?
                """,
                (status, limit),
            )
        else:
            cursor = await db.execute(
                """
                SELECT p.*, u.telegram_id, u.first_name, u.username,
                       strftime('%d.%m.%Y %H:%M', p.created_at) AS date
                FROM payments p
                JOIN users u ON u.id = p.user_id
                ORDER BY p.id DESC LIMIT ?
                """,
                (limit,),
            )
        return [dict(row) for row in await cursor.fetchall()]


async def get_all_orders(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT o.*, u.telegram_id, u.first_name, u.username,
                   strftime('%d.%m.%Y %H:%M', o.created_at) AS date
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.id DESC LIMIT ?
            """,
            (limit,),
        )
        return [dict(row) for row in await cursor.fetchall()]


async def get_all_users(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, telegram_id, first_name, last_name, username, balance,
                   strftime('%d.%m.%Y', created_at) AS date
            FROM users ORDER BY id DESC LIMIT ?
            """,
            (limit,),
        )
        return [dict(row) for row in await cursor.fetchall()]
