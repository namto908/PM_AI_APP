from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.common.database import get_db
from app.auth.dependencies import get_current_user
from app.work.schemas import (
    ProjectCreate,
    ProjectResponse,
    TaskCreate,
    TaskUpdate,
    TaskFilter,
    TaskResponse,
    CommentCreate,
    CommentResponse,
    PaginatedTasks,
    ActivityResponse,
)
from app.work.service import WorkService

router = APIRouter(tags=["work"])


# ---- Projects ----

@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).list_projects(workspace_id, current_user)


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    workspace_id: uuid.UUID,
    body: ProjectCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).create_project(workspace_id, body, current_user)


# ---- Tasks ----

@router.get("/workspaces/{workspace_id}/tasks", response_model=PaginatedTasks)
async def list_tasks(
    workspace_id: uuid.UUID,
    filters: TaskFilter = Depends(),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).list_tasks(workspace_id, filters, current_user)


@router.post("/workspaces/{workspace_id}/tasks", response_model=TaskResponse, status_code=201)
async def create_task(
    workspace_id: uuid.UUID,
    body: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).create_task(workspace_id, body, current_user)


@router.get("/workspaces/{workspace_id}/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).get_task(workspace_id, task_id, current_user)


@router.patch("/workspaces/{workspace_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).update_task(workspace_id, task_id, body, current_user)


@router.delete("/workspaces/{workspace_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await WorkService(db).delete_task(workspace_id, task_id, current_user)


# ---- Comments ----

@router.post(
    "/workspaces/{workspace_id}/tasks/{task_id}/comments",
    response_model=CommentResponse,
    status_code=201,
)
async def add_comment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).add_comment(workspace_id, task_id, body, current_user)


@router.get(
    "/workspaces/{workspace_id}/tasks/{task_id}/comments",
    response_model=list[CommentResponse],
)
async def get_comments(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).get_comments(workspace_id, task_id, current_user)

# ---- Activities ----

@router.get(
    "/workspaces/{workspace_id}/tasks/{task_id}/activities",
    response_model=list[ActivityResponse],
)
async def get_activities(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkService(db).get_activities(workspace_id, task_id, current_user)
