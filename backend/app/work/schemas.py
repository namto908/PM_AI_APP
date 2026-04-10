from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
import uuid
from datetime import date, datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        return v.strip()


class ProjectResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str]
    color: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    assignee_id: Optional[uuid.UUID] = None
    priority: str = "medium"
    due_date: Optional[date] = None
    tags: List[str] = []

    @field_validator("priority")
    @classmethod
    def valid_priority(cls, v: str) -> str:
        if v not in ("low", "medium", "high", "urgent"):
            raise ValueError("priority must be one of: low, medium, high, urgent")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[uuid.UUID] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("todo", "in_progress", "in_review", "done"):
            raise ValueError("Invalid status value")
        return v


class TaskResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    parent_id: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    status: str
    priority: str
    assignee_id: Optional[uuid.UUID]
    due_date: Optional[date]
    tags: List[str]
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    action: str
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskFilter(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    top_level_only: bool = False
    include_deleted: bool = False
    page: int = 1
    page_size: int = 20


class PaginatedTasks(BaseModel):
    items: List[TaskResponse]
    total: int
    page: int
    page_size: int
