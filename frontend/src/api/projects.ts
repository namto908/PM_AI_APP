import client from './client';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string;
  created_at: string;
}

export const projectsApi = {
  list: (workspaceId: string) =>
    client.get<Project[]>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: string, data: { name: string; description?: string; color?: string }) =>
    client.post<Project>(`/workspaces/${workspaceId}/projects`, data),
};
