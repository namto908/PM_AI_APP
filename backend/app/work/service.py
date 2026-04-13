from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime

from app.work.repository import WorkRepository
from app.work.models import Project, Task, TaskComment, TaskActivity
from app.work.schemas import (
    ProjectCreate,
    ProjectResponse,
    TaskCreate,
    TaskUpdate,
    TaskFilter,
    TaskResponse,
    CommentCreate,
    CommentResponse,
    ActivityResponse,
    PaginatedTasks,
)


class WorkService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WorkRepository(db)

    # ---- Projects ----

    async def list_projects(self, workspace_id: uuid.UUID, current_user: dict) -> list[ProjectResponse]:
        projects = await self.repo.get_projects(workspace_id)
        return projects

    async def create_project(
        self, workspace_id: uuid.UUID, body: ProjectCreate, current_user: dict
    ) -> ProjectResponse:
        user_id = uuid.UUID(current_user["user_id"])
        project = Project(
            workspace_id=workspace_id,
            name=body.name,
            description=body.description,
            color=body.color,
            created_by=user_id,
        )
        return await self.repo.create_project(project)

    # ---- Tasks ----

    async def list_tasks(
        self, workspace_id: uuid.UUID, filters: TaskFilter, current_user: dict
    ) -> PaginatedTasks:
        tasks, total = await self.repo.get_tasks(workspace_id, filters)
        return PaginatedTasks(
            items=tasks,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
        )

    async def get_task(
        self, workspace_id: uuid.UUID, task_id: uuid.UUID, current_user: dict
    ) -> TaskResponse:
        task = await self.repo.get_task(workspace_id, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return task

    async def create_task(
        self, workspace_id: uuid.UUID, body: TaskCreate, current_user: dict
    ) -> TaskResponse:
        user_id = uuid.UUID(current_user["user_id"])

        # Validate project belongs to workspace
        if body.project_id:
            project = await self.repo.get_project(workspace_id, body.project_id)
            if not project:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        task = Task(
            workspace_id=workspace_id,
            project_id=body.project_id,
            parent_id=body.parent_id,
            title=body.title,
            description=body.description,
            priority=body.priority,
            assignee_id=body.assignee_id,
            due_date=body.due_date,
            tags=body.tags or [],
            created_by=user_id,
        )
        created = await self.repo.create_task(task)

        await self.repo.create_activity(
            TaskActivity(
                task_id=created.id,
                user_id=user_id,
                action="created",
                new_value={"title": body.title},
            )
        )
        
        if body.parent_id:
            await self.repo.create_activity(
                TaskActivity(
                    task_id=body.parent_id,
                    user_id=user_id,
                    action="subtask_added",
                    new_value={"subtask_id": str(created.id), "title": body.title},
                )
            )
            
        return created

    async def update_task(
        self,
        workspace_id: uuid.UUID,
        task_id: uuid.UUID,
        body: TaskUpdate,
        current_user: dict,
    ) -> TaskResponse:
        task = await self.repo.get_task(workspace_id, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        updates = body.model_dump(exclude_unset=True)
        old_values = {k: getattr(task, k) for k in updates}
        updated = await self.repo.update_task(task, updates)

        user_id = uuid.UUID(current_user["user_id"])
        await self.repo.create_activity(
            TaskActivity(
                task_id=task_id,
                user_id=user_id,
                action="updated",
                old_value={k: str(v) for k, v in old_values.items()},
                new_value={k: str(v) for k, v in updates.items()},
            )
        )
        return updated

    async def delete_task(
        self, workspace_id: uuid.UUID, task_id: uuid.UUID, current_user: dict
    ) -> None:
        task = await self.repo.get_task(workspace_id, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        await self.repo.delete_task(task)

    async def list_trash(
        self, workspace_id: uuid.UUID, current_user: dict
    ) -> list:
        """Return deleted tasks. superadmin/manager see all; others see only their own."""
        system_role = current_user.get("system_role", "employee")
        workspace_role = current_user.get("workspace_role", "employee")
        can_see_all = system_role in ("superadmin", "manager") or workspace_role in ("owner", "manager")
        user_id = uuid.UUID(current_user["user_id"]) if not can_see_all else None
        return await self.repo.get_deleted_tasks(workspace_id, user_id=user_id)

    async def restore_task(
        self, workspace_id: uuid.UUID, task_id: uuid.UUID, current_user: dict
    ) -> TaskResponse:
        """Restore a soft-deleted task. Only superadmin/manager (system or workspace) allowed."""
        system_role = current_user.get("system_role", "employee")
        workspace_role = current_user.get("workspace_role", "employee")
        can_restore = system_role in ("superadmin", "manager") or workspace_role in ("owner", "manager")
        if not can_restore:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers and above can restore tasks")

        task = await self.repo.get_task(workspace_id, task_id, include_deleted=True)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        if not task.is_deleted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is not deleted")
        return await self.repo.restore_task(task)

    # ---- Comments ----

    async def add_comment(
        self,
        workspace_id: uuid.UUID,
        task_id: uuid.UUID,
        body: CommentCreate,
        current_user: dict,
    ) -> CommentResponse:
        task = await self.repo.get_task(workspace_id, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        user_id = uuid.UUID(current_user["user_id"])
        comment = TaskComment(task_id=task_id, user_id=user_id, content=body.content)
        return await self.repo.create_comment(comment)

    async def get_comments(
        self,
        workspace_id: uuid.UUID,
        task_id: uuid.UUID,
        current_user: dict,
    ) -> list[CommentResponse]:
        task = await self.repo.get_task(workspace_id, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return await self.repo.get_comments(task_id)

    # ---- Activity ----

    async def get_activities(
        self,
        workspace_id: uuid.UUID,
        task_id: uuid.UUID,
        current_user: dict,
    ) -> list[ActivityResponse]:
        task = await self.repo.get_task(workspace_id, task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return await self.repo.get_activities(task_id)
