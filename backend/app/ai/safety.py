class SafetyLayer:
    WRITE_TOOLS = {"create_task", "update_task_status", "assign_task", "add_task_comment"}
    MAX_TOOL_LOOPS = 5

    def is_write_tool(self, tool_name: str) -> bool:
        return tool_name in self.WRITE_TOOLS

    def check_loop_limit(self, iteration: int) -> bool:
        return iteration < self.MAX_TOOL_LOOPS

    def needs_confirmation(self, tool_name: str, context: dict) -> bool:
        """Write actions require explicit user confirmation."""
        if not self.is_write_tool(tool_name):
            return False
        return not context.get("user_confirmed", False)

    def build_confirmation_message(self, tool_name: str, args: dict) -> str:
        descriptions = {
            "create_task": f"Tạo task mới: **{args.get('title', '(không có tiêu đề)')}**",
            "update_task_status": f"Cập nhật status task `{args.get('task_id', '?')}` → `{args.get('status', '?')}`",
            "assign_task": f"Gán task `{args.get('task_id', '?')}` cho user `{args.get('assignee_id', '?')}`",
            "add_task_comment": f"Thêm comment vào task `{args.get('task_id', '?')}`",
        }
        action_desc = descriptions.get(tool_name, tool_name)
        return f"Xác nhận: {action_desc}? Trả lời **yes** để thực hiện hoặc **no** để huỷ."
