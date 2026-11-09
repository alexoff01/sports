#!/usr/bin/env python3
"""Reset the admin password from the server (the only recovery path; there is no email reset).

Usage (on the server, from the repository root):
    python scripts/reset_admin_password.py            # new password, revokes every session
    python scripts/reset_admin_password.py --reset-totp  # also clears two-factor setup (lost device)

The new password is read with hidden input and never printed or logged.
"""
import argparse
import getpass
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND / ".env")

import pymongo  # noqa: E402

from passwords import hash_password, policy_error  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset the admin password and revoke all sessions.")
    parser.add_argument("--reset-totp", action="store_true", help="also clear two-factor setup and recovery codes")
    args = parser.parse_args()

    email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    db = pymongo.MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    user = db.users.find_one({"email": email}) if email else None
    if not user:
        print("No admin account found for ADMIN_EMAIL. Start the backend once to seed it.", file=sys.stderr)
        return 1

    password = getpass.getpass("New admin password: ")
    if getpass.getpass("Repeat new password: ") != password:
        print("The passwords do not match. Nothing changed.", file=sys.stderr)
        return 1
    problem = policy_error(password, email)
    if problem:
        print(problem + " Nothing changed.", file=sys.stderr)
        return 1

    update = {"password_hash": hash_password(password), "failed_attempts": 0, "locked_until": None,
              "updated_at": datetime.now(timezone.utc)}
    if args.reset_totp:
        update |= {"totp_secret_encrypted": None, "totp_enabled": False, "recovery_codes_hashed": []}
    db.users.update_one({"_id": user["_id"]}, {"$set": update})
    revoked = db.admin_sessions.update_many({"revoked": False}, {"$set": {"revoked": True}}).modified_count
    db.auth_lockouts.delete_many({})
    print(f"Password updated. {revoked} session(s) revoked." + (" Two-factor setup cleared." if args.reset_totp else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
