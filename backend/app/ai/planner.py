"""
AI Planner — uses Gemma 3 27B (Google AI) or Grok (xAI) to perform
reasoning and planning before Gemini tool execution.

ACTIVE_PLANNER controls which backend is used:
  "gemma"  → gemma-3-27b-it via Google AI (same GEMINI_API_KEY)
  "grok"   → xAI OpenAI-compatible API (XAI_API_KEY + XAI_MODEL)
  "none"   → planning disabled (default)
"""
import asyncio
import json
import re
from typing import TypedDict


PLANNER_SYSTEM_PROMPT = """Bạn là AI Planner — phân tích yêu cầu và lập kế hoạch hành động trước khi thực thi.

Khi nhận yêu cầu từ user, hãy:
1. REASON: Suy nghĩ chi tiết từng bước về ý định của user, dữ liệu cần thu thập, thứ tự thực hiện.
2. PLAN: Tạo kế hoạch cụ thể, ngắn gọn gồm các bước tuần tự.

Tools có thể dùng trong execution:
- list_tasks / get_task_detail / get_task_summary — đọc task
- list_servers / get_service_status / get_server_metrics / list_active_alerts / get_incident_summary — monitoring
- create_task / update_task_status / assign_task / add_task_comment — ghi (cần xác nhận user)

Trả về JSON CHÍNH XÁC theo format sau (không thêm text khác ngoài JSON):
{
  "reasoning": "phân tích chi tiết: user muốn gì, dữ liệu nào cần lấy, logic từng bước, edge cases cần xử lý",
  "plan": "Bước 1: [hành động] → Bước 2: [hành động] → ... → Bước N: [tổng hợp/trả lời]"
}"""


class PlanResult(TypedDict):
    reasoning: str
    plan: str


def _extract_json(text: str) -> PlanResult | None:
    """Extract JSON from model response, handling markdown code blocks."""
    # Try direct parse
    try:
        data = json.loads(text.strip())
        return PlanResult(
            reasoning=data.get("reasoning", ""),
            plan=data.get("plan", ""),
        )
    except Exception:
        pass

    # Try ```json ... ``` block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            return PlanResult(
                reasoning=data.get("reasoning", ""),
                plan=data.get("plan", ""),
            )
        except Exception:
            pass

    # Greedy { ... }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            return PlanResult(
                reasoning=data.get("reasoning", ""),
                plan=data.get("plan", ""),
            )
        except Exception:
            pass

    return None


async def _plan_with_gemma(user_message: str, context_snapshot: str) -> PlanResult:
    """Use Gemma 3 27B via Google AI for planning/reasoning.
    Note: gemma-3-27b-it does NOT support system_instruction — put it in the prompt body.
    """
    import google.generativeai as genai
    from app.common.config import settings

    genai.configure(api_key=settings.GEMINI_API_KEY)
    # Do NOT pass system_instruction — Gemma models don't support it via this API
    model = genai.GenerativeModel(model_name=settings.PLANNER_MODEL)
    prompt = (
        f"{PLANNER_SYSTEM_PROMPT}\n\n"
        f"=== Context workspace ===\n{context_snapshot}\n\n"
        f"=== Yêu cầu user ===\n{user_message}"
    )
    try:
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text.strip()
        result = _extract_json(text)
        if result:
            return result
        # Fallback: whole response as reasoning
        return PlanResult(reasoning=text, plan="")
    except Exception as e:
        return PlanResult(reasoning=f"[Planner error: {e}]", plan="")


async def _plan_with_grok(user_message: str, context_snapshot: str) -> PlanResult:
    """Use Grok via xAI OpenAI-compatible API for planning/reasoning."""
    from openai import AsyncOpenAI
    from app.common.config import settings

    client = AsyncOpenAI(
        api_key=settings.XAI_API_KEY,
        base_url="https://api.x.ai/v1",
    )
    prompt = (
        f"=== Context workspace ===\n{context_snapshot}\n\n"
        f"=== Yêu cầu user ===\n{user_message}"
    )
    try:
        response = await client.chat.completions.create(
            model=settings.XAI_MODEL,
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
        )
        text = (response.choices[0].message.content or "").strip()
        result = _extract_json(text)
        if result:
            return result
        return PlanResult(reasoning=text, plan="")
    except Exception as e:
        return PlanResult(reasoning=f"[Planner error: {e}]", plan="")


async def run_planner(user_message: str, context_snapshot: str) -> PlanResult | None:
    """
    Route to the configured planner model.
    Returns None when planning is disabled (ACTIVE_PLANNER=none).
    Errors are caught internally — execution continues without planning.
    """
    from app.common.config import settings

    planner = settings.ACTIVE_PLANNER.lower()

    if planner == "gemma":
        if not settings.GEMINI_API_KEY:
            return None
        return await _plan_with_gemma(user_message, context_snapshot)

    if planner == "grok":
        if not settings.XAI_API_KEY:
            return None
        return await _plan_with_grok(user_message, context_snapshot)

    return None
