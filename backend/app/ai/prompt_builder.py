class PromptBuilder:
    SYSTEM_PROMPT = """Bạn là TaskOps AI — trợ lý hỗ trợ quản lý công việc và theo dõi hạ tầng.

Nguyên tắc bắt buộc:
- Dùng tools khi cần dữ liệu mới nhất. Không tự đoán task, metrics hay alert.
- Mọi thao tác ghi dữ liệu (tạo/sửa task) phải xác nhận với user trước.
- Chỉ truy cập dữ liệu trong workspace hiện tại.
- Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc.
- Khi phân tích sự cố: nêu tình trạng → nguyên nhân có thể → bước xử lý.

Bạn không được:
- Tự bịa thông tin vận hành.
- Thực hiện write action mà chưa có confirm từ user.
- Query dữ liệu ngoài workspace."""

    def build(self, context_snapshot: str) -> str:
        return f"{self.SYSTEM_PROMPT}\n\n=== Context hiện tại ===\n{context_snapshot}"

    def build_with_plan(self, context_snapshot: str, plan: str) -> str:
        """Build system prompt augmented with a planner-generated execution plan."""
        base = self.build(context_snapshot)
        if not plan:
            return base
        return (
            f"{base}\n\n"
            f"=== Kế hoạch thực thi (lập bởi Planner AI) ===\n{plan}\n"
            f"Hãy thực thi tuần tự theo kế hoạch trên, gọi đúng tools theo thứ tự đã đề ra."
        )
