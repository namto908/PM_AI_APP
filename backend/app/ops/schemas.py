from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime


class ServerCreate(BaseModel):
    name: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    environment: str = "production"
    tags: List[str] = []


class ServerResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    hostname: Optional[str]
    ip_address: Optional[str]
    environment: str
    tags: List[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ServerRegistrationResponse(ServerResponse):
    agent_token: str


class ServiceCreate(BaseModel):
    name: str
    port: Optional[int] = None
    check_type: str = "http"
    check_target: Optional[str] = None


class ServiceResponse(BaseModel):
    id: uuid.UUID
    server_id: uuid.UUID
    name: str
    status: str
    last_checked_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class MetricsIngest(BaseModel):
    cpu_percent: Optional[float] = None
    ram_percent: Optional[float] = None
    ram_used_mb: Optional[int] = None
    ram_total_mb: Optional[int] = None
    disk_percent: Optional[float] = None
    load_1m: Optional[float] = None
    load_5m: Optional[float] = None
    load_15m: Optional[float] = None
    net_in_kbps: Optional[int] = None
    net_out_kbps: Optional[int] = None


class AlertResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    server_id: Optional[uuid.UUID]
    service_id: Optional[uuid.UUID]
    severity: str
    title: str
    message: Optional[str]
    metric_name: Optional[str]
    metric_value: Optional[float]
    resolved: bool
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertRuleCreate(BaseModel):
    server_id: Optional[uuid.UUID] = None
    metric_name: str
    operator: str
    threshold: float
    duration_min: int = 5
    severity: str = "warning"
