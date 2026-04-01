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
    task_id: str,
    status: str,
) -> dict:
    """Update task status. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import TaskUpdate

    fake_user = {"user_id": str(uuid.uuid4())}
    body = TaskUpdate(status=status)
    task = await WorkService(db).update_task(workspace_id, uuid.UUID(task_id), body, fake_user)
    return {"task_id": task_id, "status": task.status, "updated": True}


async def assign_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    task_id: str,
    assignee_id: str,
) -> dict:
    """Assign task to a user. Only call after user confirmation."""
    from app.work.service import WorkService
    from app.work.schemas import TaskUpdate

    fake_user = {"user_id": str(uuid.uuid4())}
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
