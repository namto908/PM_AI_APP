import client from './client';

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export const aiApi = {
  listConversations: (workspaceId: string) =>
    client.get<Conversation[]>(`/ai/workspaces/${workspaceId}/conversations`),
};

export const AI_CHAT_URL = (workspaceId: string) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/ai/workspaces/${workspaceId}/chat`;
