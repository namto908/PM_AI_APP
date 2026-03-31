from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.common.database import get_db
from app.auth.dependencies import get_current_user
from app.ops.schemas import (
    ServerCreate,
    ServerResponse,
    ServerRegistrationResponse,
    ServiceCreate,
    ServiceResponse,
    MetricsIngest,
    AlertResponse,
    AlertRuleCreate,
)
from app.ops.service import OpsService

router = APIRouter(prefix="/ops", tags=["ops"])


# ---- Servers ----

@router.get("/workspaces/{workspace_id}/servers", response_model=list[ServerResponse])
async def list_servers(
    workspace_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).list_servers(workspace_id)


@router.post("/workspaces/{workspace_id}/servers", response_model=ServerRegistrationResponse, status_code=201)
async def register_server(
    workspace_id: uuid.UUID,
    body: ServerCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).register_server(workspace_id, body, current_user)


# ---- Services ----

@router.get("/workspaces/{workspace_id}/servers/{server_id}/services", response_model=list[ServiceResponse])
async def list_services(
    workspace_id: uuid.UUID,
    server_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).list_services(workspace_id, server_id)


@router.post(
    "/workspaces/{workspace_id}/servers/{server_id}/services",
    response_model=ServiceResponse,
    status_code=201,
)
async def create_service(
    workspace_id: uuid.UUID,
    server_id: uuid.UUID,
    body: ServiceCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).create_service(workspace_id, server_id, body, current_user)


# ---- Metrics Ingest (agent auth via header) ----

@router.post("/metrics/ingest")
async def ingest_metrics(
    body: MetricsIngest,
    x_agent_token: str = Header(..., alias="X-Agent-Token"),
    db: AsyncSession = Depends(get_db),
):
    """Receive metrics from server agents. Authenticated via X-Agent-Token header."""
    return await OpsService(db).ingest_metrics(x_agent_token, body)


# ---- Alerts ----

@router.get("/workspaces/{workspace_id}/alerts", response_model=list[AlertResponse])
async def list_alerts(
    workspace_id: uuid.UUID,
    resolved: bool = False,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).list_alerts(workspace_id, resolved)


@router.patch("/workspaces/{workspace_id}/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    workspace_id: uuid.UUID,
    alert_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).resolve_alert(workspace_id, alert_id, current_user)


# ---- Alert Rules ----

@router.post("/workspaces/{workspace_id}/alert-rules", status_code=201)
async def create_alert_rule(
    workspace_id: uuid.UUID,
    body: AlertRuleCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OpsService(db).create_alert_rule(workspace_id, body, current_user)
