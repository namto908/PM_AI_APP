from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.database import get_db
from app.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    WorkspaceCreate,
    WorkspaceResponse,
    UserResponse,
    UserUpdateRequest,
    ChangePasswordRequest,
)
from app.auth.service import AuthService
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).register(body)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).login(body)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await AuthService(db).get_me(current_user["user_id"])
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuthService(db).update_me(current_user["user_id"], body)


@router.post("/me/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService(db).change_password(current_user["user_id"], body)


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuthService(db).create_workspace(body, current_user)


@router.get("/workspaces", response_model=list[WorkspaceResponse])
async def list_workspaces(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuthService(db).list_workspaces(current_user)


@router.delete("/workspaces/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService(db).delete_workspace(workspace_id, current_user)
