"""Admin API — superadmin-only user management and workspace member management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime, timezone

from app.common.database import get_db
from app.auth.dependencies import get_current_user, require_system_role, SYSTEM_ROLE_ORDER, WORKSPACE_ROLE_ORDER
from app.auth.models import User, WorkspaceMember, Workspace
from app.auth.schemas import UserResponse, AdminUserUpdate, WorkspaceMemberAdd, WorkspaceMemberResponse

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_superadmin(current_user: dict) -> None:
    if current_user.get("system_role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")


def _can_manage_workspace_members(current_user: dict, workspace_role: str | None = None) -> bool:
    """Returns True if user is superadmin OR a workspace owner/manager."""
    if current_user.get("system_role") == "superadmin":
        return True
    wr = workspace_role or current_user.get("workspace_role", "employee")
    try:
        return WORKSPACE_ROLE_ORDER.index(wr) >= WORKSPACE_ROLE_ORDER.index("manager")
    except ValueError:
        return False


# ── User management (superadmin only) ────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_superadmin(current_user)
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_superadmin(current_user)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.system_role is not None:
        user.system_role = body.system_role
    if body.is_active is not None:
        user.is_active = body.is_active
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(user)
    return user


# ── Workspace member management (superadmin or workspace owner/manager) ───────

@router.get("/workspaces/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
async def list_workspace_members(
    workspace_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Any authenticated workspace member may list members; superadmin always allowed
    result = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
    )
    members = result.scalars().all()
    return [
        WorkspaceMemberResponse(
            user_id=m.user_id,
            role=m.role,
            joined_at=m.joined_at.isoformat(),
        )
        for m in members
    ]


@router.post("/workspaces/{workspace_id}/members", status_code=201)
async def add_workspace_member(
    workspace_id: uuid.UUID,
    body: WorkspaceMemberAdd,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_workspace_members(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only workspace managers and above can add members")

    # Verify workspace exists
    ws = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    if not ws.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    # Verify user exists
    user_check = await db.execute(select(User).where(User.id == body.user_id))
    if not user_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check not already a member
    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == body.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a workspace member")

    member = WorkspaceMember(workspace_id=workspace_id, user_id=body.user_id, role=body.role)
    db.add(member)
    await db.commit()
    return {"workspace_id": str(workspace_id), "user_id": str(body.user_id), "role": body.role, "added": True}


@router.delete("/workspaces/{workspace_id}/members/{user_id}", status_code=204)
async def remove_workspace_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_workspace_members(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only workspace managers and above can remove members")

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Prevent removing the owner
    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the workspace owner")

    await db.delete(member)
    await db.commit()


@router.patch("/workspaces/{workspace_id}/members/{user_id}", status_code=200)
async def update_workspace_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    body: WorkspaceMemberAdd,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_workspace_members(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only workspace managers and above can update roles")

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == "owner" and body.role != "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote the workspace owner")

    member.role = body.role
    await db.commit()
    return {"workspace_id": str(workspace_id), "user_id": str(user_id), "role": member.role}
