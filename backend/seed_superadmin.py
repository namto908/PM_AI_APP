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
from passlib.context import CryptContext

from app.auth.models import User
from app.common.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed(email: str, name: str | None, password: str | None) -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.system_role = "superadmin"
            user.is_active = True
            await db.commit()
            print(f"✅ User '{email}' promoted to superadmin.")
        else:
            if not password:
                print("❌ User not found. Provide --password to create a new superadmin.")
                return
            user = User(
                email=email,
                name=name or "Super Admin",
                password_hash=pwd_context.hash(password),
                system_role="superadmin",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print(f"✅ Superadmin user '{email}' created.")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed superadmin user")
    parser.add_argument("--email", required=True, help="Email of the superadmin user")
    parser.add_argument("--name", default="Super Admin", help="Display name")
    parser.add_argument("--password", default=None, help="Password (required if user doesn't exist)")
    args = parser.parse_args()

    asyncio.run(seed(args.email, args.name, args.password))
