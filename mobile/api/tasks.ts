import client from './client';

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  due_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  project_id?: string;
  parent_id?: string;
  top_level_only?: boolean;
  page?: number;
  page_size?: number;
}

export const tasksApi = {
  list: (workspaceId: string, filters: TaskFilter = {}) =>
    client.get<PaginatedTasks>(`/workspaces/${workspaceId}/tasks`, { params: filters }),

  get: (workspaceId: string, taskId: string) =>
    client.get<Task>(`/workspaces/${workspaceId}/tasks/${taskId}`),

  create: (workspaceId: string, data: any) =>
    client.post<Task>(`/workspaces/${workspaceId}/tasks`, data),

  update: (workspaceId: string, taskId: string, data: any) =>
    client.patch<Task>(`/workspaces/${workspaceId}/tasks/${taskId}`, data),

  delete: (workspaceId: string, taskId: string) =>
    client.delete(`/workspaces/${workspaceId}/tasks/${taskId}`),
};
