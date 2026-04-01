import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AI_CHAT_URL } from '@/api/ai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'thinking';
  content: string;
  toolName?: string;
}

export interface StreamMeta {
  conversation_id?: string;
  awaiting_confirm?: boolean;
  pending_tool?: { name: string; args: Record<string, unknown> };
  done?: boolean;
}

function storageKey(workspaceId: string) {
  return `chat_history_${workspaceId}`;
}

function loadHistory(workspaceId: string): { messages: ChatMessage[]; conversationId: string | null } {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { messages: [], conversationId: null };
}

export function useChatStream(workspaceId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    workspaceId ? loadHistory(workspaceId).messages : []
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() =>
    workspaceId ? loadHistory(workspaceId).conversationId : null
  );
  const [meta, setMeta] = useState<StreamMeta | null>(null);
  const token = useAuthStore((s) => s.token);

  // Reload history when workspace changes
  useEffect(() => {
    if (!workspaceId) return;
    const saved = loadHistory(workspaceId);
    setMessages(saved.messages);
    setConversationId(saved.conversationId);
  }, [workspaceId]);

  // Persist whenever messages or conversationId change
  useEffect(() => {
    if (!workspaceId) return;
    localStorage.setItem(
      storageKey(workspaceId),
      JSON.stringify({ messages, conversationId })
    );
  }, [workspaceId, messages, conversationId]);

  const send = useCallback(
    async (text: string) => {
      if (!workspaceId || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      // Capture pending_tool BEFORE clearing meta — needed when user is confirming a write action
      const pendingTool = meta?.awaiting_confirm ? meta.pending_tool : undefined;
      setMeta(null);

      const apiUrl = AI_CHAT_URL(workspaceId);
      const body = JSON.stringify({
        message: text,
        conversation_id: conversationId,
        ...(pendingTool ? { pending_tool: pendingTool } : {}),
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (!response.ok || !response.body) {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: 'Lỗi kết nối tới AI.' },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value);
        const lines = raw.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json);
            if (event.type === 'thinking') {
              // Planner reasoning — add before the assistant bubble
              setMessages((prev) => [
                ...prev,
                { id: `thinking-${Date.now()}-${Math.random()}`, role: 'thinking', content: event.content },
              ]);
            } else if (event.type === 'text') {
              if (!assistantId) {
                assistantId = `assistant-${Date.now()}`;
                setMessages((prev) => [...prev, { id: assistantId!, role: 'assistant', content: '' }]);
              }
              assistantContent += event.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            } else if (event.type === 'meta') {
              if (event.conversation_id) setConversationId(event.conversation_id);
              setMeta(event);
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      setIsStreaming(false);
    },
    [workspaceId, token, conversationId, isStreaming, meta]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setMeta(null);
    if (workspaceId) localStorage.removeItem(storageKey(workspaceId));
  }, [workspaceId]);

  return { messages, isStreaming, send, clear, conversationId, meta };
}
