import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'thinking';
  content: string;
  toolName?: string;
}

export interface StreamMeta {
  conversation_id?: string;
  awaiting_confirm?: boolean;
  pending_tool?: any;
  done?: boolean;
}

const STORAGE_KEY = (wsId: string) => `chat_history_${wsId}`;

export function useChatStream(workspaceId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [meta, setMeta] = useState<StreamMeta | null>(null);
  const token = useAuthStore((s) => s.token);

  // Load history on mount or workspace change
  useEffect(() => {
    if (!workspaceId) return;
    AsyncStorage.getItem(STORAGE_KEY(workspaceId)).then((raw) => {
      if (raw) {
        const { messages, conversationId } = JSON.parse(raw);
        setMessages(messages);
        setConversationId(conversationId);
      }
    });
  }, [workspaceId]);

  // Persist history
  useEffect(() => {
    if (!workspaceId) return;
    AsyncStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify({ messages, conversationId }));
  }, [workspaceId, messages, conversationId]);

  const send = useCallback(async (text: string) => {
    if (!workspaceId || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const pendingTool = meta?.awaiting_confirm ? meta.pending_tool : undefined;
    setMeta(null);

    const apiUrl = `${BASE_URL}/ai/workspace/${workspaceId}/chat`;
    const body = JSON.stringify({
      message: text,
      conversation_id: conversationId,
      ...(pendingTool ? { pending_tool: pendingTool } : {}),
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (!response.ok) throw new Error('Network response was not ok');

      // Note: Streaming fetch in React Native varies by environment.
      // We implement a basic reader if available, or fallback to text.
      // In many RN environments, response.body is null or not a ReadableStream.
      
      const reader = (response as any).body?.getReader();
      if (!reader) {
        // Fallback for non-streaming environments (e.g. some Android versions)
        const fullText = await response.text();
        // Parse the SSE format manually from the full text
        const lines = fullText.split('\n').filter(l => l.startsWith('data: '));
        processLines(lines);
      } else {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const raw = decoder.decode(value);
          const lines = raw.split('\n').filter(l => l.startsWith('data: '));
          processLines(lines);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Lỗi kết nối tới AI Assistant.' },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [workspaceId, token, conversationId, isStreaming, meta]);

  const processLines = (lines: string[]) => {
    let assistantId: string | null = null;
    let assistantContent = '';

    for (const line of lines) {
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        const event = JSON.parse(json);
        if (event.type === 'thinking') {
          setMessages((prev) => [
            ...prev, 
            { id: `thinking-${Date.now()}-${Math.random()}`, role: 'thinking', content: event.content }
          ]);
        } else if (event.type === 'text') {
          if (!assistantId) {
            assistantId = `assistant-${Date.now()}`;
            setMessages((prev) => [...prev, { id: assistantId!, role: 'assistant', content: '' }]);
          }
          assistantContent += event.content;
          setMessages((prev) => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
        } else if (event.type === 'meta') {
          if (event.conversation_id) setConversationId(event.conversation_id);
          setMeta(event);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  };

  const clear = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setMeta(null);
    if (workspaceId) AsyncStorage.removeItem(STORAGE_KEY(workspaceId));
  }, [workspaceId]);

  return { messages, isStreaming, send, clear, meta };
}
