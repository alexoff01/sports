"""Password hashing (Argon2id, OWASP parameters) and the password policy for passwords chosen in the admin."""
import secrets

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# OWASP Password Storage Cheat Sheet: Argon2id, m=19 MiB, t=2, p=1.
HASHER = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1, hash_len=32, salt_len=16, type=Type.ID)

# Verified against when the email is unknown, so both paths cost one Argon2 verification.
DUMMY_HASH = HASHER.hash(secrets.token_urlsafe(32))

MIN_LENGTH = 12
MAX_LENGTH = 256


def hash_password(password: str) -> str:
    return HASHER.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    """Always performs exactly one Argon2 verification."""
    try:
        return HASHER.verify(password_hash or DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def is_weak(password: str) -> bool:
    return len(password) < MIN_LENGTH


def policy_error(password: str, email: str) -> str | None:
    """Policy for passwords chosen in Settings or the reset script (the seed password is exempt)."""
    if len(password) < MIN_LENGTH:
        return f"The new password must be at least {MIN_LENGTH} characters."
    if len(password) > MAX_LENGTH:
        return f"The new password must be at most {MAX_LENGTH} characters."
    if password.strip().lower() == (email or "").strip().lower():
        return "The new password must not be your email address."
    return None
