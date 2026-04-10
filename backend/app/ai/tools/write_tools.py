"""Write tools — only called after explicit user confirmation."""
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import date


async def create_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    description: str | None = None,
    assignee_id: str | None = None,
    priority: str = "medium",
    due_date: str | None = None,
) -> dict:
    """Create a new task. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import TaskCreate

    try:
        assignee = uuid.UUID(assignee_id) if assignee_id else None
    except (ValueError, AttributeError):
        raise ValueError(
            f"assignee_id không hợp lệ: '{assignee_id}'. "
            "Vui lòng cung cấp UUID hợp lệ. "
            "Nếu muốn giao cho bản thân, hãy dùng 'Current user ID' từ context."
        )
    parsed_due = date.fromisoformat(due_date) if due_date else None

    body = TaskCreate(
        title=title,
        description=description,
        assignee_id=assignee,
        priority=priority,
        due_date=parsed_due,
    )
    fake_user = {"user_id": str(user_id)}
    task = await WorkService(db).create_task(workspace_id, body, fake_user)
    return {
        "id": str(task.id),
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "created": True,
    }


async def update_task_status(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    task_id: str,
    status: str,
) -> dict:
    """Update task status. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import TaskUpdate

    fake_user = {"user_id": str(user_id)}
    body = TaskUpdate(status=status)
    task = await WorkService(db).update_task(workspace_id, uuid.UUID(task_id), body, fake_user)
    return {"task_id": task_id, "status": task.status, "updated": True}


async def assign_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    task_id: str,
    assignee_id: str,
) -> dict:
    """Assign task to a user. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import TaskUpdate

    fake_user = {"user_id": str(user_id)}
    body = TaskUpdate(assignee_id=uuid.UUID(assignee_id))
    task = await WorkService(db).update_task(workspace_id, uuid.UUID(task_id), body, fake_user)
    return {"task_id": task_id, "assignee_id": assignee_id, "assigned": True}


async def add_task_comment(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    task_id: str,
    content: str,
) -> dict:
    """Add comment to a task. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import CommentCreate

    fake_user = {"user_id": str(user_id)}
    body = CommentCreate(content=content)
    comment = await WorkService(db).add_comment(workspace_id, uuid.UUID(task_id), body, fake_user)
    return {
        "comment_id": str(comment.id),
        "task_id": task_id,
        "content": comment.content,
        "created": True,
    }

async def update_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    task_id: str,
    title: str | None = None,
    description: str | None = None,
    priority: str | None = None,
    due_date: str | None = None,
    assignee_id: str | None = None,
) -> dict:
    """Update general task fields. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import TaskUpdate

    updates = {}
    if title is not None:
        updates["title"] = title
    if description is not None:
        updates["description"] = description
    if priority is not None:
        updates["priority"] = priority
    if due_date is not None:
        updates["due_date"] = date.fromisoformat(due_date) if due_date else None
    if assignee_id is not None:
        updates["assignee_id"] = uuid.UUID(assignee_id) if assignee_id else None

    if not updates:
        return {"task_id": task_id, "updated": False, "message": "No fields provided for update"}

    fake_user = {"user_id": str(user_id)}
    body = TaskUpdate(**updates)
    task = await WorkService(db).update_task(workspace_id, uuid.UUID(task_id), body, fake_user)
    
    return {
        "task_id": str(task.id),
        "updated_fields": list(updates.keys()),
        "updated": True
    }


async def delete_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    task_id: str,
) -> dict:
    """Delete a task (mark as deleted). Only call after user confirmation."""
    from app.work.service import WorkService

    fake_user = {"user_id": str(user_id)}
    await WorkService(db).delete_task(workspace_id, uuid.UUID(task_id), fake_user)
    return {"task_id": task_id, "deleted": True}
