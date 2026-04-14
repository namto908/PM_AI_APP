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
  created_by: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
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
  assignee_id?: string;
  created_by?: string;
  project_id?: string;
  parent_id?: string;
  top_level_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface TaskCreate {
  title: string;
  description?: string;
  project_id?: string;
  parent_id?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
  tags?: string[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_value: Record<string, string> | null;
  new_value: Record<string, string> | null;
  created_at: string;
}

export const tasksApi = {
  list: (workspaceId: string, filters: TaskFilter = {}) =>
    client.get<PaginatedTasks>(`/workspaces/${workspaceId}/tasks`, { params: filters }),

  get: (workspaceId: string, taskId: string) =>
    client.get<Task>(`/workspaces/${workspaceId}/tasks/${taskId}`),

  create: (workspaceId: string, data: TaskCreate) =>
    client.post<Task>(`/workspaces/${workspaceId}/tasks`, data),

  update: (workspaceId: string, taskId: string, data: TaskUpdate) =>
    client.patch<Task>(`/workspaces/${workspaceId}/tasks/${taskId}`, data),

  delete: (workspaceId: string, taskId: string) =>
    client.delete(`/workspaces/${workspaceId}/tasks/${taskId}`),

  addComment: (workspaceId: string, taskId: string, content: string) =>
    client.post(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, { content }),

  getComments: (workspaceId: string, taskId: string) =>
    client.get<TaskComment[]>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`),

  getActivities: (workspaceId: string, taskId: string) =>
    client.get<TaskActivity[]>(`/workspaces/${workspaceId}/tasks/${taskId}/activities`),

  listTrash: (workspaceId: string) =>
    client.get<Task[]>(`/workspaces/${workspaceId}/tasks/trash`),

  restore: (workspaceId: string, taskId: string) =>
    client.post<Task>(`/workspaces/${workspaceId}/tasks/${taskId}/restore`),
};
