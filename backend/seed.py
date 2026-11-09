"""Idempotent seeding of the single administrator account from environment variables."""
import asyncio
import logging

from pymongo.errors import DuplicateKeyError

from core import now
from passwords import hash_password, is_weak, verify_password

logger = logging.getLogger("portfolio.seed")


async def ensure_user_indexes(database) -> None:
    await database.users.create_index("email", unique=True)
    # Every user is an admin and only one may exist: a unique index on role enforces it at database level.
    await database.users.create_index("role", unique=True)


async def seed_admin(database, email: str, password: str) -> str:
    """Returns 'created', 'exists', 'refused' or 'skipped'. Never overwrites an existing account."""
    email = (email or "").strip().lower()
    if not email:
        logger.warning("ADMIN_EMAIL is not set; admin seeding skipped.")
        return "skipped"
    existing = await database.users.find_one({"email": email}, {"_id": 1, "password_hash": 1})
    if existing:
        if password and is_weak(password) and await asyncio.to_thread(verify_password, existing.get("password_hash"), password):
            logger.warning("The admin account still uses a weak initial password. Change it in the admin Settings.")
        return "exists"
    if await database.users.count_documents({}) > 0:
        logger.error("Admin seeding refused: an admin account already exists and only one is allowed.")
        return "refused"
    if not password:
        logger.warning("ADMIN_INITIAL_PASSWORD is not set; admin seeding skipped.")
        return "skipped"
    t = now()
    doc = {
        "email": email,
        "password_hash": await asyncio.to_thread(hash_password, password),
        "role": "admin",
        "totp_secret_encrypted": None,
        "totp_enabled": False,
        "recovery_codes_hashed": [],
        "failed_attempts": 0,
        "locked_until": None,
        "created_at": t,
        "updated_at": t,
    }
    try:
        await database.users.insert_one(doc)
    except DuplicateKeyError:
        logger.error("Admin seeding refused: an admin account already exists and only one is allowed.")
        return "refused"
    logger.info("Admin account created")
    if is_weak(password):
        logger.warning("The initial admin password is weak (shorter than 12 characters). Change it in the admin Settings after first sign-in.")
    return "created"
