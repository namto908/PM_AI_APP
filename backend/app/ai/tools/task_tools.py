from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
import uuid

from app.work.models import Task


async def list_tasks(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    status: str | None = None,
    priority: str | None = None,
    assignee_id: str | None = None,
    project_id: str | None = None,
    limit: int = 20,
) -> dict:
    """Return filtered task list for the workspace."""
    query = select(Task).where(Task.workspace_id == workspace_id, Task.is_deleted == False)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if assignee_id:
        query = query.where(Task.assignee_id == uuid.UUID(assignee_id))
    if project_id:
        query = query.where(Task.project_id == uuid.UUID(project_id))
    query = query.order_by(Task.created_at.desc()).limit(limit)

    result = await db.execute(query)
    tasks = result.scalars().all()
    return {
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "assignee_id": str(t.assignee_id) if t.assignee_id else None,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "project_id": str(t.project_id) if t.project_id else None,
            }
            for t in tasks
        ],
        "total": len(tasks),
    }


async def get_task_detail(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    task_id: str,
) -> dict:
    """Return full detail of a single task."""
    result = await db.execute(
        select(Task).where(Task.id == uuid.UUID(task_id), Task.workspace_id == workspace_id, Task.is_deleted == False)
    )
    task = result.scalar_one_or_none()
    if not task:
        return {"error": "Task not found"}
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "assignee_id": str(task.assignee_id) if task.assignee_id else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "project_id": str(task.project_id) if task.project_id else None,
        "tags": task.tags,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


async def get_task_summary(db: AsyncSession, workspace_id: uuid.UUID) -> dict:
    """Return task status summary for the workspace."""
    today = date.today()

    async def count_where(*conditions):
        q = select(func.count()).select_from(Task).where(Task.workspace_id == workspace_id, *conditions)
        r = await db.execute(q)
        return r.scalar_one()

    total_active = await count_where(Task.is_deleted == False)
    top_level = await count_where(Task.parent_id.is_(None), Task.is_deleted == False)
    subtasks = await count_where(Task.parent_id.is_not(None), Task.is_deleted == False)
    
    total_open = await count_where(Task.status.notin_(["done"]), Task.is_deleted == False)
    top_level_open = await count_where(Task.parent_id.is_(None), Task.status.notin_(["done"]), Task.is_deleted == False)
    urgent = await count_where(Task.priority == "urgent", Task.status.notin_(["done"]), Task.is_deleted == False)
    overdue = await count_where(
        Task.due_date < today,
        Task.status.notin_(["done"]),
        Task.is_deleted == False,
    )
    in_progress = await count_where(Task.status == "in_progress", Task.is_deleted == False)
    done_count = await count_where(Task.status == "done", Task.is_deleted == False)
    done_today = await count_where(Task.status == "done", Task.updated_at >= datetime.combine(today, datetime.min.time()), Task.is_deleted == False)

    # Archived stats (soft-deleted)
    total_archived = await count_where(Task.is_deleted == True)

    return {
        "total_active_tasks": total_active,
        "top_level_tasks": top_level,
        "subtasks": subtasks,
        "total_open": total_open,
        "top_level_open": top_level_open,
        "urgent": urgent,
        "overdue": overdue,
        "in_progress": in_progress,
        "total_done": done_count,
        "done_today": done_today,
        "total_archived": total_archived,
    }


async def list_deleted_tasks(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    limit: int = 20,
) -> dict:
    """Return list of soft-deleted tasks (Trash)."""
    query = select(Task).where(Task.workspace_id == workspace_id, Task.is_deleted == True)
    query = query.order_by(Task.updated_at.desc()).limit(limit)

    result = await db.execute(query)
    tasks = result.scalars().all()
    return {
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "deleted_at": t.updated_at.isoformat() if t.updated_at else None,
                "original_created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tasks
        ],
        "total": len(tasks),
    }
