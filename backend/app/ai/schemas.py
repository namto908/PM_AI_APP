from pydantic import BaseModel
from typing import Optional, Any
import uuid
from datetime import datetime


class PendingTool(BaseModel):
    name: str
    args: dict = {}


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None
    pending_tool: Optional[PendingTool] = None


class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: Optional[str]
    tool_name: Optional[str]
    tool_calls: Optional[Any]
    created_at: datetime

    model_config = {"from_attributes": True}
