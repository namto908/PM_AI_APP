from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.common.database import get_db
from app.auth.dependencies import get_current_user
from app.ai.schemas import ChatRequest, ConversationResponse
from app.ai.orchestrator import AgentOrchestrator
from app.ai.models import AIConversation

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/workspaces/{workspace_id}/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    workspace_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = uuid.UUID(current_user["user_id"])
    result = await db.execute(
        select(AIConversation)
        .where(
            AIConversation.workspace_id == workspace_id,
            AIConversation.user_id == user_id,
        )
        .order_by(AIConversation.updated_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.post("/workspaces/{workspace_id}/chat")
async def chat(
    workspace_id: uuid.UUID,
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE streaming endpoint for AI chat."""
    user_id = uuid.UUID(current_user["user_id"])

    # Parse confirm response from user
    message_lower = body.message.strip().lower()
    user_confirmed = message_lower in ("yes", "có", "xác nhận", "ok", "đồng ý")

    async def event_stream():
        try:
            orchestrator = AgentOrchestrator(db, workspace_id, user_id)
            async for chunk in orchestrator.run(
                user_message=body.message,
                conversation_id=body.conversation_id,
                user_confirmed=user_confirmed,
            ):
                yield chunk
        except Exception as e:
            import json as _json
            yield f"data: {_json.dumps({'type': 'text', 'content': f'Lỗi hệ thống: {e}'})}\n\n"
            yield f"data: {_json.dumps({'type': 'meta', 'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
