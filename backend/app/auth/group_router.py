"""Group management API — managers and above can manage groups."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime, timezone

from app.common.database import get_db
from app.auth.dependencies import get_current_user, SYSTEM_ROLE_ORDER, WORKSPACE_ROLE_ORDER
from app.auth.models import Group, GroupMember, WorkspaceMember
from app.auth.schemas import GroupCreate, GroupResponse, GroupMemberAdd

router = APIRouter(tags=["groups"])


def _can_manage_groups(current_user: dict) -> bool:
    system_role = current_user.get("system_role", "employee")
    workspace_role = current_user.get("workspace_role", "employee")
    try:
        sys_ok = SYSTEM_ROLE_ORDER.index(system_role) >= SYSTEM_ROLE_ORDER.index("manager")
    except ValueError:
        sys_ok = False
    try:
        ws_ok = WORKSPACE_ROLE_ORDER.index(workspace_role) >= WORKSPACE_ROLE_ORDER.index("manager")
    except ValueError:
        ws_ok = False
    return sys_ok or ws_ok


@router.get("/workspaces/{workspace_id}/groups", response_model=list[GroupResponse])
async def list_groups(
    workspace_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Group).where(Group.workspace_id == workspace_id).order_by(Group.created_at.desc())
    )
    return result.scalars().all()


@router.post("/workspaces/{workspace_id}/groups", response_model=GroupResponse, status_code=201)
async def create_group(
    workspace_id: uuid.UUID,
    body: GroupCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_groups(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers and above can create groups")
    user_id = uuid.UUID(current_user["user_id"])
    group = Group(workspace_id=workspace_id, name=body.name, created_by=user_id)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.post("/workspaces/{workspace_id}/groups/{group_id}/members", status_code=201)
async def add_group_member(
    workspace_id: uuid.UUID,
    group_id: uuid.UUID,
    body: GroupMemberAdd,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_groups(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers and above can manage group members")

    # Verify group belongs to workspace
    result = await db.execute(
        select(Group).where(Group.id == group_id, Group.workspace_id == workspace_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Check not already a member
    existing = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == body.user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this group")

    member = GroupMember(group_id=group_id, user_id=body.user_id)
    db.add(member)
    await db.commit()
    return {"group_id": str(group_id), "user_id": str(body.user_id), "added": True}


@router.delete("/workspaces/{workspace_id}/groups/{group_id}/members/{user_id}", status_code=204)
async def remove_group_member(
    workspace_id: uuid.UUID,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _can_manage_groups(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers and above can manage group members")

    result = await db.execute(
        select(Group).where(Group.id == group_id, Group.workspace_id == workspace_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in group")

    await db.delete(member)
    await db.commit()
