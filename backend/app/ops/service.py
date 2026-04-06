from fastapi import HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import uuid
import secrets

from app.ops.models import Server, Service, Alert, AlertRule, ServerMetric
from app.ops.schemas import (
    ServerCreate,
    ServiceCreate,
    MetricsIngest,
    ServerResponse,
    ServerRegistrationResponse,
    ServiceResponse,
    AlertResponse,
    AlertRuleCreate,
)


class OpsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Servers ----

    async def list_servers(self, workspace_id: uuid.UUID) -> list[ServerResponse]:
        result = await self.db.execute(
            select(Server)
            .where(Server.workspace_id == workspace_id, Server.is_active == True)
            .order_by(Server.created_at.desc())
        )
        return result.scalars().all()

    async def register_server(
        self, workspace_id: uuid.UUID, body: ServerCreate, current_user: dict
    ) -> ServerRegistrationResponse:
        token = secrets.token_urlsafe(32)
        server = Server(
            workspace_id=workspace_id,
            name=body.name,
            hostname=body.hostname,
            ip_address=body.ip_address,
            environment=body.environment,
            tags=body.tags,
            agent_token=token,
        )
        self.db.add(server)
        await self.db.commit()
        await self.db.refresh(server)
        data = ServerRegistrationResponse(
            id=server.id,
            workspace_id=server.workspace_id,
            name=server.name,
            hostname=server.hostname,
            ip_address=server.ip_address,
            environment=server.environment,
            tags=server.tags or [],
            is_active=server.is_active,
            created_at=server.created_at,
            agent_token=token,
        )
        return data

    # ---- Services ----

    async def list_services(self, workspace_id: uuid.UUID, server_id: uuid.UUID) -> list[ServiceResponse]:
        result = await self.db.execute(
            select(Service)
            .join(Server, Server.id == Service.server_id)
            .where(Server.workspace_id == workspace_id, Service.server_id == server_id)
        )
        return result.scalars().all()

    async def create_service(
        self, workspace_id: uuid.UUID, server_id: uuid.UUID, body: ServiceCreate, current_user: dict
    ) -> ServiceResponse:
        server = await self._get_server(workspace_id, server_id)
        service = Service(
            server_id=server.id,
            name=body.name,
            port=body.port,
            check_type=body.check_type,
            check_target=body.check_target,
        )
        self.db.add(service)
        await self.db.commit()
        await self.db.refresh(service)
        return service

    # ---- Metrics Ingest ----

    async def ingest_metrics(self, agent_token: str, body: MetricsIngest) -> dict:
        result = await self.db.execute(
            select(Server).where(Server.agent_token == agent_token, Server.is_active == True)
        )
        server = result.scalar_one_or_none()
        if not server:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid agent token")

        metric = ServerMetric(
            time=datetime.now(timezone.utc).replace(tzinfo=None),
            server_id=server.id,
            cpu_percent=body.cpu_percent,
            ram_percent=body.ram_percent,
            ram_used_mb=body.ram_used_mb,
            ram_total_mb=body.ram_total_mb,
            disk_percent=body.disk_percent,
            load_1m=body.load_1m,
            load_5m=body.load_5m,
            load_15m=body.load_15m,
            net_in_kbps=body.net_in_kbps,
            net_out_kbps=body.net_out_kbps,
        )
        self.db.add(metric)
        await self.db.commit()

        # Trigger alert check asynchronously (fire-and-forget)
        await self._check_alert_rules(server, body)
        return {"status": "ok", "server_id": str(server.id)}

    async def _check_alert_rules(self, server: Server, metrics: MetricsIngest) -> None:
        result = await self.db.execute(
            select(AlertRule).where(
                AlertRule.workspace_id == server.workspace_id,
                AlertRule.server_id == server.id,
                AlertRule.is_active == True,
            )
        )
        rules = result.scalars().all()
        metric_values = {
            "cpu_percent": metrics.cpu_percent,
            "ram_percent": metrics.ram_percent,
            "disk_percent": metrics.disk_percent,
            "load_1m": metrics.load_1m,
            "load_5m": metrics.load_5m,
        }
        operators = {">": lambda a, b: a > b, ">=": lambda a, b: a >= b, "<": lambda a, b: a < b, "<=": lambda a, b: a <= b}

        for rule in rules:
            value = metric_values.get(rule.metric_name)
            if value is None:
                continue
            op_fn = operators.get(rule.operator)
            if op_fn and op_fn(float(value), float(rule.threshold)):
                # Check if already have an open alert for this rule
                existing = await self.db.execute(
                    select(Alert).where(
                        Alert.workspace_id == server.workspace_id,
                        Alert.server_id == server.id,
                        Alert.metric_name == rule.metric_name,
                        Alert.resolved == False,
                    )
                )
                if not existing.scalar_one_or_none():
                    alert = Alert(
                        workspace_id=server.workspace_id,
                        server_id=server.id,
                        severity=rule.severity,
                        title=f"{rule.metric_name} threshold exceeded on {server.name}",
                        message=f"{rule.metric_name} = {value} (threshold: {rule.operator} {rule.threshold})",
                        metric_name=rule.metric_name,
                        metric_value=float(value),
                        threshold=float(rule.threshold),
                    )
                    self.db.add(alert)
                    await self.db.commit()

    # ---- Alerts ----

    async def list_alerts(
        self, workspace_id: uuid.UUID, resolved: bool = False
    ) -> list[AlertResponse]:
        result = await self.db.execute(
            select(Alert)
            .where(Alert.workspace_id == workspace_id, Alert.resolved == resolved)
            .order_by(Alert.created_at.desc())
            .limit(100)
        )
        return result.scalars().all()

    async def resolve_alert(
        self, workspace_id: uuid.UUID, alert_id: uuid.UUID, current_user: dict
    ) -> AlertResponse:
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.workspace_id == workspace_id)
        )
        alert = result.scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        alert.resolved = True
        alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        alert.resolved_by = uuid.UUID(current_user["user_id"])
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    # ---- Alert Rules ----

    async def create_alert_rule(
        self, workspace_id: uuid.UUID, body: AlertRuleCreate, current_user: dict
    ) -> dict:
        rule = AlertRule(
            workspace_id=workspace_id,
            server_id=body.server_id,
            metric_name=body.metric_name,
            operator=body.operator,
            threshold=body.threshold,
            duration_min=body.duration_min,
            severity=body.severity,
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return {"id": str(rule.id), "created": True}

    # ---- Helpers ----

    async def _get_server(self, workspace_id: uuid.UUID, server_id: uuid.UUID) -> Server:
        result = await self.db.execute(
            select(Server).where(Server.id == server_id, Server.workspace_id == workspace_id)
        )
        server = result.scalar_one_or_none()
        if not server:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
        return server
