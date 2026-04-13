from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.ai.tool_registry import ToolRegistry, ToolDefinition
from app.ai.tools import task_tools, monitoring_tools

# System role hierarchy for permission checks
_ROLE_ORDER = ["guest", "employee", "manager", "superadmin"]


def _role_gte(user_role: str, minimum: str) -> bool:
    try:
        return _ROLE_ORDER.index(user_role) >= _ROLE_ORDER.index(minimum)
    except ValueError:
        return False


def build_registry(db: AsyncSession, workspace_id: uuid.UUID, user_role: str = "employee") -> ToolRegistry:
    registry = ToolRegistry()

    # ---- Read tools: Tasks ----
    registry.register(ToolDefinition(
        name="list_tasks",
        description="Liệt kê task trong workspace theo filter. Dùng khi cần xem danh sách task.",
        parameters={
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["todo", "in_progress", "in_review", "done"], "description": "Filter by task status"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Filter by priority"},
                "assignee_id": {"type": "string", "description": "Filter by assignee UUID"},
                "project_id": {"type": "string", "description": "Filter by project UUID"},
                "limit": {"type": "integer", "description": "Max tasks to return (1-100)"},
            },
        },
        handler=lambda **kwargs: task_tools.list_tasks(db, workspace_id, **kwargs),
    ))

    registry.register(ToolDefinition(
        name="get_task_detail",
        description="Lấy chi tiết đầy đủ của một task cụ thể theo ID.",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID của task"},
            },
            "required": ["task_id"],
        },
        handler=lambda **kwargs: task_tools.get_task_detail(db, workspace_id, **kwargs),
    ))

    registry.register(ToolDefinition(
        name="get_task_summary",
        description="Tóm tắt tổng quan trạng thái task trong workspace: đếm open, urgent, overdue, in_progress, và số lượng task trong thùng rác.",
        parameters={
            "type": "object",
            "properties": {},
        },
        handler=lambda **kwargs: task_tools.get_task_summary(db, workspace_id),
    ))

    registry.register(ToolDefinition(
        name="list_deleted_tasks",
        description="Liệt kê danh sách các task đã bị xóa (nằm trong Thùng rác).",
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Số lượng task tối đa (1-100)"},
            },
        },
        handler=lambda **kwargs: task_tools.list_deleted_tasks(db, workspace_id, **kwargs),
    ))

    # ---- Read tools: Monitoring ----
    registry.register(ToolDefinition(
        name="list_servers",
        description="Liệt kê tất cả servers đang được monitor trong workspace.",
        parameters={
            "type": "object",
            "properties": {},
        },
        handler=lambda **kwargs: monitoring_tools.list_servers(db, workspace_id),
    ))

    registry.register(ToolDefinition(
        name="get_service_status",
        description="Lấy trạng thái hiện tại của một service (status, up/down, metric cơ bản) trên một server cụ thể.",
        parameters={
            "type": "object",
            "properties": {
                "service_id": {"type": "string", "description": "UUID của service"},
            },
            "required": ["service_id"],
        },
        handler=lambda **kwargs: monitoring_tools.get_service_status(db, workspace_id, **kwargs),
    ))

    registry.register(ToolDefinition(
        name="get_server_metrics",
        description="Lấy metrics gần nhất của một server (CPU, RAM, disk, load average).",
        parameters={
            "type": "object",
            "properties": {
                "server_id": {"type": "string", "description": "UUID của server"},
                "time_range": {"type": "string", "enum": ["1h", "6h", "24h", "7d"], "description": "Khoảng thời gian (mặc định: 1h)"},
            },
            "required": ["server_id"],
        },
        handler=lambda **kwargs: monitoring_tools.get_server_metrics(db, workspace_id, **kwargs),
    ))

    registry.register(ToolDefinition(
        name="list_active_alerts",
        description="Liệt kê các alert đang mở (chưa resolve) trong workspace.",
        parameters={
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["info", "warning", "critical"], "description": "Filter by severity"},
            },
        },
        handler=lambda **kwargs: monitoring_tools.list_active_alerts(db, workspace_id, **kwargs),
    ))

    registry.register(ToolDefinition(
        name="get_incident_summary",
        description="Tóm tắt tình trạng sự cố của một service: status + alerts + metrics.",
        parameters={
            "type": "object",
            "properties": {
                "service_id": {"type": "string", "description": "UUID của service"},
            },
            "required": ["service_id"],
        },
        handler=lambda **kwargs: monitoring_tools.get_incident_summary(db, workspace_id, **kwargs),
    ))

    return registry


def build_registry_with_write_tools(
    db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID, user_role: str = "employee"
) -> ToolRegistry:
    """Registry including write tools (used after confirmation), filtered by user_role."""
    from app.ai.tools import write_tools

    registry = build_registry(db, workspace_id, user_role)

    # Guests only get read tools — skip all write tools
    if user_role == "guest":
        return registry

    registry.register(ToolDefinition(
        name="create_task",
        description="Tạo task mới trong workspace. Chỉ gọi sau khi user xác nhận.",
        parameters={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Tiêu đề task"},
                "description": {"type": "string", "description": "Mô tả chi tiết"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Độ ưu tiên (mặc định: medium)"},
                "assignee_id": {"type": "string", "description": "UUID người được gán"},
                "due_date": {"type": "string", "description": "Ngày hết hạn (YYYY-MM-DD)"},
            },
            "required": ["title"],
        },
        handler=lambda **kwargs: write_tools.create_task(db, workspace_id, user_id, **kwargs),
        requires_confirm=True,
    ))

    registry.register(ToolDefinition(
        name="update_task_status",
        description="Cập nhật status của một task. Chỉ gọi sau khi user xác nhận.",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID của task"},
                "status": {"type": "string", "enum": ["todo", "in_progress", "in_review", "done"]},
            },
            "required": ["task_id", "status"],
        },
        handler=lambda **kwargs: write_tools.update_task_status(db, workspace_id, user_id, **kwargs),
        requires_confirm=True,
    ))

    registry.register(ToolDefinition(
        name="update_task",
        description="Cập nhật các trường chung của task (tiêu đề, mô tả, ưu tiên, ngày hết hạn, người được gán). Dùng khi user muốn sửa nội dung task. Chỉ gọi sau khi user xác nhận.",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID của task"},
                "title": {"type": "string", "description": "Tiêu đề mới"},
                "description": {"type": "string", "description": "Mô tả mới (markdown)"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "description": "Độ ưu tiên mới"},
                "due_date": {"type": "string", "description": "Ngày hết hạn mới (YYYY-MM-DD)"},
                "assignee_id": {"type": "string", "description": "UUID người được gán mới"},
            },
            "required": ["task_id"],
        },
        handler=lambda **kwargs: write_tools.update_task(db, workspace_id, user_id, **kwargs),
        requires_confirm=True,
    ))

    registry.register(ToolDefinition(
        name="assign_task",
        description="Gán task cho một người dùng. Chỉ gọi sau khi user xác nhận.",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID của task"},
                "assignee_id": {"type": "string", "description": "UUID người được gán"},
            },
            "required": ["task_id", "assignee_id"],
        },
        handler=lambda **kwargs: write_tools.assign_task(db, workspace_id, user_id, **kwargs),
        requires_confirm=True,
    ))

    registry.register(ToolDefinition(
        name="add_task_comment",
        description="Thêm comment vào một task. Chỉ gọi sau khi user xác nhận.",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID của task"},
                "content": {"type": "string", "description": "Nội dung comment"},
            },
            "required": ["task_id", "content"],
        },
        handler=lambda **kwargs: write_tools.add_task_comment(db, workspace_id, user_id, **kwargs),
        requires_confirm=True,
    ))

    registry.register(ToolDefinition(
        name="delete_task",
        description="Xóa một task (chuyển vào thùng rác). Chỉ gọi sau khi user xác nhận.",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID của task"},
            },
            "required": ["task_id"],
        },
        handler=lambda **kwargs: write_tools.delete_task(db, workspace_id, user_id, **kwargs),
        requires_confirm=True,
    ))

    # Restore task: only for manager/superadmin
    if _role_gte(user_role, "manager"):
        registry.register(ToolDefinition(
            name="restore_task",
            description="Khôi phục task từ thùng rác. Chỉ manager/superadmin mới được phép. Chỉ gọi sau khi user xác nhận.",
            parameters={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "UUID của task cần khôi phục"},
                },
                "required": ["task_id"],
            },
            handler=lambda **kwargs: write_tools.restore_task(db, workspace_id, user_id, user_role=user_role, **kwargs),
            requires_confirm=True,
        ))

    return registry
