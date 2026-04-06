from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import uuid
from datetime import datetime, timezone

from app.work.models import Project, Task, TaskComment, TaskActivity, DeletedTask
from app.work.schemas import TaskFilter


class WorkRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Projects ----

    async def get_projects(self, workspace_id: uuid.UUID) -> list[Project]:
        result = await self.db.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id, Project.status == "active")
            .order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_project(self, workspace_id: uuid.UUID, project_id: uuid.UUID) -> Project | None:
        result = await self.db.execute(
            select(Project).where(
                Project.id == project_id, Project.workspace_id == workspace_id
            )
        )
        return result.scalar_one_or_none()

    async def create_project(self, project: Project) -> Project:
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    # ---- Tasks ----

    async def get_tasks(self, workspace_id: uuid.UUID, filters: TaskFilter) -> tuple[list[Task], int]:
        query = select(Task).where(Task.workspace_id == workspace_id)

        if filters.status:
            query = query.where(Task.status == filters.status)
        if filters.priority:
            query = query.where(Task.priority == filters.priority)
        if filters.assignee_id:
            query = query.where(Task.assignee_id == filters.assignee_id)
        if filters.project_id:
            query = query.where(Task.project_id == filters.project_id)
        if filters.top_level_only:
            query = query.where(Task.parent_id.is_(None))
        if filters.parent_id:
            query = query.where(Task.parent_id == filters.parent_id)

        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()

        offset = (filters.page - 1) * filters.page_size
        query = query.order_by(Task.position.asc(), Task.created_at.desc())
        query = query.offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_task(self, workspace_id: uuid.UUID, task_id: uuid.UUID) -> Task | None:
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def create_task(self, task: Task) -> Task:
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_task(self, task: Task, updates: dict) -> Task:
        new_status = updates.get("status")
        if new_status == "cancelled":
            await self._archive_task_recursive(task, reason="cancelled")
            await self.db.commit()
            return task # Returns the task which is now deleted from session/DB, but metadata is in DeletedTask

        for key, value in updates.items():
            setattr(task, key, value)
        task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def _archive_task_recursive(self, task: Task, reason: str) -> None:
        """Helper to recursively move a task and its subtasks to DeletedTask."""
        # 1. Archive the task itself
        archive = DeletedTask(
            id=task.id,
            workspace_id=task.workspace_id,
            project_id=task.project_id,
            parent_id=task.parent_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            assignee_id=task.assignee_id,
            created_by=task.created_by,
            due_date=task.due_date,
            position=task.position,
            tags=task.tags,
            metadata_=task.metadata_,
            created_at=task.created_at,
            updated_at=task.updated_at,
            archive_reason=reason
        )
        self.db.add(archive)
        
        # 2. Archive subtasks
        result = await self.db.execute(select(Task).where(Task.parent_id == task.id))
        subtasks = result.scalars().all()
        for subtask in subtasks:
            await self._archive_task_recursive(subtask, reason)
            
        # 3. Delete from main table
        await self.db.delete(task)

    async def delete_task(self, task: Task) -> None:
        await self._archive_task_recursive(task, reason="deleted")
        await self.db.commit()

    # ---- Comments ----

    async def get_comments(self, task_id: uuid.UUID) -> list[TaskComment]:
        result = await self.db.execute(
            select(TaskComment)
            .where(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.asc())
        )
        return list(result.scalars().all())

    async def create_comment(self, comment: TaskComment) -> TaskComment:
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return comment

    # ---- Activity ----

    async def create_activity(self, activity: TaskActivity) -> None:
        self.db.add(activity)
        await self.db.commit()

    async def get_activities(self, task_id: uuid.UUID) -> list[TaskActivity]:
        result = await self.db.execute(
            select(TaskActivity)
            .where(TaskActivity.task_id == task_id)
            .order_by(TaskActivity.created_at.desc())
        )
        return list(result.scalars().all())
