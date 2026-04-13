#!/usr/bin/env python3
"""Seed script: create or promote a superadmin user.

Usage:
    python seed_superadmin.py --email admin@example.com --name "Super Admin" --password secretpass
    python seed_superadmin.py --email existing@example.com  # promote existing user to superadmin
"""
import asyncio
import argparse
import sys
import os

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import bcrypt

from app.auth.models import User
from app.common.config import settings

def _hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


async def seed(email: str, username: str, name: str | None, password: str | None) -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(
            select(User).where((User.email == email) | (User.username == username))
        )
        user = result.scalar_one_or_none()

        if user:
            user.system_role = "superadmin"
            user.is_active = True
            if password:
                user.password_hash = _hash_password(password)
            await db.commit()
            print(f"✅ User '{email}/{username}' updated/promoted to superadmin with current password.")
        else:
            if not password:
                print("❌ User not found. Provide --password to create a new superadmin.")
                return
            user = User(
                email=email,
                username=username,
                name=name or "Super Admin",
                password_hash=_hash_password(password),
                system_role="superadmin",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print(f"✅ Superadmin user '{email}/{username}' created.")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed superadmin user")
    parser.add_argument("--identifier", default=settings.SUPERADMIN_IDENTIFIER, help="Email or Username of the superadmin")
    parser.add_argument("--name", default="Super Admin", help="Display name")
    parser.add_argument("--password", default=settings.SUPERADMIN_PASSWORD, help="Password (required if user doesn't exist)")
    args = parser.parse_args()

    if not args.identifier:
        print("❌ Error: identifier must be provided via CLI or .env")
        sys.exit(1)

    # Use identifier for both email and username for the root admin
    asyncio.run(seed(args.identifier, args.identifier, args.name, args.password))
