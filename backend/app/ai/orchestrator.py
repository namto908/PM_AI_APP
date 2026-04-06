import json
import uuid
from typing import AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.context_builder import ContextBuilder
from app.ai.prompt_builder import PromptBuilder
from app.ai.safety import SafetyLayer
from app.ai.setup import build_registry_with_write_tools
from app.ai.planner import run_planner
from app.ai.models import AIConversation, AIMessage
from app.common.config import settings
from sqlalchemy import select


class AgentOrchestrator:
    def __init__(self, db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID):
        self.db = db
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.context_builder = ContextBuilder(db)
        self.prompt_builder = PromptBuilder()
        self.safety = SafetyLayer()

    def _xai_client(self) -> AsyncOpenAI:
        return AsyncOpenAI(
            api_key=settings.XAI_API_KEY,
            base_url="https://api.x.ai/v1",
        )

    async def _get_or_create_conversation(
        self, conversation_id: uuid.UUID | None, system_prompt: str
    ) -> AIConversation:
        if conversation_id:
            result = await self.db.execute(
                select(AIConversation).where(
                    AIConversation.id == conversation_id,
                    AIConversation.workspace_id == self.workspace_id,
                    AIConversation.user_id == self.user_id,
                )
            )
            conv = result.scalar_one_or_none()
            if conv:
                return conv

        conv = AIConversation(
            workspace_id=self.workspace_id,
            user_id=self.user_id,
            context_snapshot={"system_prompt": system_prompt[:500]},
        )
        self.db.add(conv)
        await self.db.commit()
        await self.db.refresh(conv)
        return conv

    async def _load_history(self, conversation_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
            .limit(40)
        )
        messages = result.scalars().all()
        history = []
        for m in messages:
            if m.role in ("user", "assistant"):
                history.append({"role": m.role, "content": m.content or ""})
        return history

    async def _save_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str | None = None,
        tool_name: str | None = None,
        tool_calls: dict | None = None,
    ) -> None:
        msg = AIMessage(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_name=tool_name,
            tool_calls=tool_calls,
        )
        self.db.add(msg)
        await self.db.commit()

    async def run(
        self,
        user_message: str,
        conversation_id: uuid.UUID | None = None,
        user_confirmed: bool = False,
        pending_tool: dict | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Main agent loop — yields SSE-formatted data chunks.
        Handles tool calls with safety confirmation for write actions.
        """
        context = await self.context_builder.build(self.workspace_id, self.user_id)

        # Planning step — skip for confirmation responses
        plan_result = None
        if not (user_confirmed and pending_tool):
            plan_result = await run_planner(user_message, context)

        # Build system prompt (enriched with plan when available)
        if plan_result and plan_result.get("plan"):
            system_prompt = self.prompt_builder.build_with_plan(context, plan_result["plan"])
        else:
            system_prompt = self.prompt_builder.build(context)

        conv = await self._get_or_create_conversation(conversation_id, system_prompt)
        history = await self._load_history(conv.id)

        await self._save_message(conv.id, "user", user_message)

        # Stream planning reasoning to client before execution
        if plan_result and plan_result.get("reasoning"):
            yield self._sse_thinking(plan_result["reasoning"])

        # Handle confirmed write action continuation
        if user_confirmed and pending_tool:
            # pending_tool can be a single dict or a list of dicts
            tools_to_exec = pending_tool if isinstance(pending_tool, list) else [pending_tool]
            async for chunk in self._execute_confirmed_write(conv.id, tools_to_exec):
                yield chunk
            return

        if not settings.XAI_API_KEY:
            yield self._sse("XAI_API_KEY chưa được cấu hình. Vui lòng thêm vào .env")
            return

        client = self._xai_client()
        registry = build_registry_with_write_tools(self.db, self.workspace_id, self.user_id)
        tools_schema = registry.list_openai_tools()

        # Build messages list: system + history + current user message
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        iteration = 0

        while self.safety.check_loop_limit(iteration):
            iteration += 1
            try:
                response = await client.chat.completions.create(
                    model=settings.XAI_MODEL,
                    messages=messages,
                    tools=tools_schema if tools_schema else None,
                    tool_choice="auto" if tools_schema else None,
                )
            except Exception as e:
                yield self._sse(f"Lỗi kết nối AI: {str(e)}")
                return

            choice = response.choices[0] if response.choices else None
            if not choice:
                yield self._sse("Không nhận được phản hồi từ AI.")
                return

            assistant_message = choice.message

            # No tool calls — final text response
            if not assistant_message.tool_calls:
                text = assistant_message.content or ""
                await self._save_message(conv.id, "assistant", text)
                yield self._sse(text)
                yield self._sse_meta({"conversation_id": str(conv.id), "done": True})
                return

            # Append assistant message with tool_calls to conversation
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_message.tool_calls
                ],
            })

            # Process each tool call
            write_tools_to_confirm = []
            
            for tc in assistant_message.tool_calls:
                tool_name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                except json.JSONDecodeError:
                    args = {}

                tool_def = registry.get(tool_name)
                if not tool_def:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps({"error": f"Unknown tool: {tool_name}"}),
                    })
                    continue

                # Safety check: collect write tools for confirmation
                if self.safety.is_write_tool(tool_name):
                    write_tools_to_confirm.append({"id": tc.id, "name": tool_name, "args": args})
                    continue

                # Execute read tool immediately
                try:
                    result = await tool_def.handler(**args)
                    result_str = json.dumps(result, ensure_ascii=False)
                    await self._save_message(
                        conv.id, "tool", result_str, tool_name=tool_name
                    )
                    yield self._sse_tool_call(tool_name)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": result_str,
                    })
                except Exception as e:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps({"error": str(e)}),
                    })

            # If there are write tools, pause and ask for confirmation for ALL of them
            if write_tools_to_confirm:
                confirm_msg = self.safety.build_batch_confirmation_message(write_tools_to_confirm)
                await self._save_message(
                    conv.id, "assistant", confirm_msg,
                    # We store the list of tools in tool_calls for history context if needed
                    tool_calls={"batch": write_tools_to_confirm, "awaiting_confirm": True},
                )
                yield self._sse(confirm_msg)
                yield self._sse_meta({
                    "conversation_id": str(conv.id),
                    "awaiting_confirm": True,
                    "pending_tool": write_tools_to_confirm, # Sending the full list
                    "done": True,
                })
                return

        yield self._sse("Đã đạt giới hạn vòng lặp tool. Vui lòng thử lại.")

    async def _execute_confirmed_write(
        self, conversation_id: uuid.UUID, tools_to_exec: list[dict]
    ) -> AsyncGenerator[str, None]:
        registry = build_registry_with_write_tools(self.db, self.workspace_id, self.user_id)
        results = []
        
        for tool_info in tools_to_exec:
            name = tool_info["name"]
            args = tool_info.get("args", {})
            tool_def = registry.get(name)
            
            if not tool_def:
                results.append({"tool": name, "error": "Tool not found"})
                continue
                
            try:
                result = await tool_def.handler(**args)
                results.append({"tool": name, "args": args, "result": result, "success": True})
                # Save each tool result to history
                await self._save_message(
                    conversation_id, "tool", json.dumps(result, ensure_ascii=False), tool_name=name
                )
            except Exception as e:
                results.append({"tool": name, "args": args, "error": str(e), "success": False})

        # Summary message
        summary = "Đã hoàn thành các hành động:\n"
        for i, r in enumerate(results, 1):
            status = "✅ Thành công" if r.get("success") else f"❌ Lỗi: {r.get('error')}"
            summary += f"{i}. `{r['tool']}`: {status}\n"
        
        await self._save_message(conversation_id, "assistant", summary)
        yield self._sse(summary)
        yield self._sse_meta({"conversation_id": str(conversation_id), "done": True})

    def _sse(self, text: str) -> str:
        return f"data: {json.dumps({'type': 'text', 'content': text}, ensure_ascii=False)}\n\n"

    def _sse_thinking(self, text: str) -> str:
        return f"data: {json.dumps({'type': 'thinking', 'content': text}, ensure_ascii=False)}\n\n"

    def _sse_tool_call(self, tool_name: str) -> str:
        return f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name}, ensure_ascii=False)}\n\n"

    def _sse_meta(self, meta: dict) -> str:
        return f"data: {json.dumps({'type': 'meta', **meta}, ensure_ascii=False)}\n\n"
