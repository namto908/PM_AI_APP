from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import date, datetime

from app.work.models import Task


async def count_tasks(db, workspace_id, *conditions):
    from sqlalchemy import func, select
    q = select(func.count()).select_from(Task).where(Task.workspace_id == workspace_id, *conditions)
    r = await db.execute(q)
    return r.scalar_one()


class ContextBuilder:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build(self, workspace_id: uuid.UUID, user_id: uuid.UUID | None = None) -> str:
        today = date.today()

        urgent = await count_tasks(
            self.db, workspace_id,
            Task.priority == "urgent",
            Task.status.notin_(["done", "cancelled"]),
        )
        overdue = await count_tasks(
            self.db, workspace_id,
            Task.due_date < today,
            Task.status.notin_(["done", "cancelled"]),
        )
        in_progress = await count_tasks(
            self.db, workspace_id,
            Task.status == "in_progress",
        )

        # Try to load ops data
        open_alerts = 0
        degraded_services = 0
        try:
            from app.ops.models import Alert, Service, Server
            from sqlalchemy import func

            alert_q = select(func.count()).select_from(Alert).where(
                Alert.workspace_id == workspace_id, Alert.resolved == False
            )
            open_alerts = (await self.db.execute(alert_q)).scalar_one()

            svc_q = (
                select(func.count())
                .select_from(Service)
                .join(Server, Server.id == Service.server_id)
                .where(Server.workspace_id == workspace_id, Service.status.in_(["down", "degraded"]))
            )
            degraded_services = (await self.db.execute(svc_q)).scalar_one()
        except Exception:
            pass

        lines = [
            f"Workspace ID: {workspace_id}",
            f"Hôm nay là: {today.isoformat()} # Dùng ngày này làm mốc thời gian."
        ]
        if user_id:
            # Expose current user UUID so AI can resolve "tôi/me" to the correct assignee_id
            lines.append(f"Current user ID: {user_id}  # Dùng UUID này khi user nói 'tôi', 'giao cho tôi', 'me'")
        lines.append(f"Tasks: {in_progress} đang xử lý, {urgent} urgent, {overdue} quá hạn")
        if open_alerts:
            lines.append(f"Alert đang mở: {open_alerts}")
        if degraded_services:
            lines.append(f"Services bị ảnh hưởng: {degraded_services}")
        return "\n".join(lines)
