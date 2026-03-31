from sqlalchemy.ext.asyncio import AsyncSession
import uuid


async def list_servers(db: AsyncSession, workspace_id: uuid.UUID) -> dict:
    """Return list of servers and their current statuses."""
    from app.ops.models import Server, Service
    from sqlalchemy import select

    result = await db.execute(
        select(Server).where(Server.workspace_id == workspace_id, Server.is_active == True)
    )
    servers = result.scalars().all()
    return {
        "servers": [
            {
                "id": str(s.id),
                "name": s.name,
                "hostname": s.hostname,
                "ip_address": str(s.ip_address) if s.ip_address else None,
                "environment": s.environment,
            }
            for s in servers
        ],
        "total": len(servers),
    }


async def get_service_status(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    service_id: str,
) -> dict:
    """Return current status of a service."""
    from app.ops.models import Service, Server
    from sqlalchemy import select

    result = await db.execute(
        select(Service)
        .join(Server, Server.id == Service.server_id)
        .where(Service.id == uuid.UUID(service_id), Server.workspace_id == workspace_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        return {"error": "Service not found"}
    return {
        "id": str(service.id),
        "name": service.name,
        "status": service.status,
        "last_checked_at": service.last_checked_at.isoformat() if service.last_checked_at else None,
    }


async def get_server_metrics(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    server_id: str,
    time_range: str = "1h",
) -> dict:
    """Return recent metrics snapshot for a server."""
    from app.ops.models import Server, ServerMetric
    from sqlalchemy import select, text
    from datetime import datetime, timedelta

    ranges = {"1h": 1, "6h": 6, "24h": 24, "7d": 168}
    hours = ranges.get(time_range, 1)
    since = datetime.utcnow() - timedelta(hours=hours)

    srv_result = await db.execute(
        select(Server).where(
            Server.id == uuid.UUID(server_id), Server.workspace_id == workspace_id
        )
    )
    server = srv_result.scalar_one_or_none()
    if not server:
        return {"error": "Server not found"}

    metrics_result = await db.execute(
        select(ServerMetric)
        .where(ServerMetric.server_id == uuid.UUID(server_id), ServerMetric.time >= since)
        .order_by(ServerMetric.time.desc())
        .limit(60)
    )
    metrics = metrics_result.scalars().all()

    if not metrics:
        return {"server_id": server_id, "server_name": server.name, "metrics": [], "time_range": time_range}

    latest = metrics[0]
    return {
        "server_id": server_id,
        "server_name": server.name,
        "time_range": time_range,
        "latest": {
            "cpu_percent": float(latest.cpu_percent) if latest.cpu_percent else None,
            "ram_percent": float(latest.ram_percent) if latest.ram_percent else None,
            "disk_percent": float(latest.disk_percent) if latest.disk_percent else None,
            "load_1m": float(latest.load_1m) if latest.load_1m else None,
            "time": latest.time.isoformat(),
        },
        "data_points": len(metrics),
    }


async def list_active_alerts(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    severity: str | None = None,
) -> dict:
    """Return open (unresolved) alerts for the workspace."""
    from app.ops.models import Alert
    from sqlalchemy import select

    query = select(Alert).where(Alert.workspace_id == workspace_id, Alert.resolved == False)
    if severity:
        query = query.where(Alert.severity == severity)
    query = query.order_by(Alert.created_at.desc()).limit(20)

    result = await db.execute(query)
    alerts = result.scalars().all()
    return {
        "alerts": [
            {
                "id": str(a.id),
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "server_id": str(a.server_id) if a.server_id else None,
                "metric_name": a.metric_name,
                "metric_value": float(a.metric_value) if a.metric_value else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
        "total": len(alerts),
    }


async def get_incident_summary(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    service_id: str,
) -> dict:
    """Return incident summary: service status + recent alerts + latest metrics snapshot."""
    service_info = await get_service_status(db, workspace_id, service_id)
    alerts_info = await list_active_alerts(db, workspace_id)

    # Filter alerts related to this service
    related_alerts = [a for a in alerts_info["alerts"] if a.get("server_id")][:5]

    return {
        "service": service_info,
        "recent_alerts": related_alerts,
        "summary": (
            f"Service '{service_info.get('name', '?')}' is currently {service_info.get('status', 'unknown')}. "
            f"{len(related_alerts)} active alert(s) in workspace."
        ),
    }
