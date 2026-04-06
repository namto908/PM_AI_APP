from sqlalchemy import String, Boolean, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Numeric, TIMESTAMP
import uuid
from datetime import datetime, timezone
from app.common.database import Base


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hostname: Mapped[str | None] = mapped_column(String(255))
    ip_address: Mapped[str | None] = mapped_column(INET)
    environment: Mapped[str] = mapped_column(String(20), default="production")
    agent_token: Mapped[str | None] = mapped_column(Text, unique=True, index=True)
    tags: Mapped[list] = mapped_column(ARRAY(String), default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int | None] = mapped_column(Integer)
    check_type: Mapped[str] = mapped_column(String(20), default="http")
    check_target: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="unknown")
    last_checked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class ServerMetric(Base):
    __tablename__ = "server_metrics"

    time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), primary_key=True)
    server_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("servers.id", ondelete="CASCADE"), primary_key=True
    )
    cpu_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    ram_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    ram_used_mb: Mapped[int | None] = mapped_column(Integer)
    ram_total_mb: Mapped[int | None] = mapped_column(Integer)
    disk_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    load_1m: Mapped[float | None] = mapped_column(Numeric(6, 3))
    load_5m: Mapped[float | None] = mapped_column(Numeric(6, 3))
    load_15m: Mapped[float | None] = mapped_column(Numeric(6, 3))
    net_in_kbps: Mapped[int | None] = mapped_column(Integer)
    net_out_kbps: Mapped[int | None] = mapped_column(Integer)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    server_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("servers.id", ondelete="SET NULL")
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("services.id", ondelete="SET NULL")
    )
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    metric_name: Mapped[str | None] = mapped_column(String(50))
    metric_value: Mapped[float | None] = mapped_column(Numeric(10, 3))
    threshold: Mapped[float | None] = mapped_column(Numeric(10, 3))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    server_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("servers.id", ondelete="CASCADE")
    )
    service_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE")
    )
    metric_name: Mapped[str] = mapped_column(String(50), nullable=False)
    operator: Mapped[str] = mapped_column(String(5), nullable=False)
    threshold: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=5)
    severity: Mapped[str] = mapped_column(String(10), default="warning")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
