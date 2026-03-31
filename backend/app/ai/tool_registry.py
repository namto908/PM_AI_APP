from typing import Callable, Dict, Any


class ToolDefinition:
    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict,
        handler: Callable,
        requires_confirm: bool = False,
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler
        self.requires_confirm = requires_confirm


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> ToolDefinition | None:
        return self._tools.get(name)

    def list_gemini_tools(self) -> list[dict]:
        """Return tool definitions in Gemini function-calling format."""
        return [
            {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters,
            }
            for t in self._tools.values()
        ]

    def list_openai_tools(self) -> list[dict]:
        """Return tool definitions in OpenAI/xAI function-calling format."""
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in self._tools.values()
        ]
