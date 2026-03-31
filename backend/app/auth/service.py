from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import uuid

from app.auth.models import User, Workspace, WorkspaceMember
from app.auth.schemas import RegisterRequest, LoginRequest, TokenResponse, WorkspaceCreate, WorkspaceResponse
from app.common.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(data, settings.JWT_SECRET, algorithm="HS256")


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, body: RegisterRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == body.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            email=body.email,
            name=body.name,
            password_hash=_hash_password(body.password),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        token = _create_token({"user_id": str(user.id), "email": user.email})
        return TokenResponse(access_token=token)

    async def login(self, body: LoginRequest) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()

        if not user or not _verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

        token = _create_token({"user_id": str(user.id), "email": user.email})
        return TokenResponse(access_token=token)

    async def get_me(self, user_id: str) -> User:
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    async def create_workspace(self, body: WorkspaceCreate, current_user: dict) -> WorkspaceResponse:
        result = await self.db.execute(select(Workspace).where(Workspace.slug == body.slug))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already taken")

        user_id = uuid.UUID(current_user["user_id"])
        workspace = Workspace(name=body.name, slug=body.slug, owner_id=user_id)
        self.db.add(workspace)
        await self.db.flush()

        member = WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role="owner")
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(workspace)

        return WorkspaceResponse(id=workspace.id, name=workspace.name, slug=workspace.slug, role="owner")

    async def list_workspaces(self, current_user: dict) -> list[WorkspaceResponse]:
        user_id = uuid.UUID(current_user["user_id"])
        result = await self.db.execute(
            select(Workspace, WorkspaceMember.role)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(WorkspaceMember.user_id == user_id)
        )
        rows = result.all()
        return [
            WorkspaceResponse(id=ws.id, name=ws.name, slug=ws.slug, role=role)
            for ws, role in rows
        ]
