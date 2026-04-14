import client from './client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  system_role: string;
  is_active: boolean;
  is_root: boolean;
}

export interface WorkspaceMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface Group {
  id: string;
  workspace_id: string;
  name: string;
  created_by: string | null;
}

export const adminApi = {
  // ── User management (superadmin only) ──────────────────────────────────────
  listUsers: () =>
    client.get<AdminUser[]>('/admin/users'),

  listTeamUsers: () =>
    client.get<AdminUser[]>('/admin/team'),

  updateUser: (userId: string, data: { system_role?: string; is_active?: boolean; name?: string; email?: string }) =>
    client.patch<AdminUser>(`/admin/users/${userId}`, data),

  deleteUser: (userId: string) =>
    client.delete(`/admin/users/${userId}`),

  createUser: (data: any) =>
    client.post<AdminUser>('/admin/users', data),

  // ── Workspace management ──────────────────────────────────────────────────
  createWorkspace: (data: { name: string; slug: string }) =>
    client.post<WorkspaceInfo>('/auth/workspaces', data),

  listWorkspaces: () =>
    client.get<WorkspaceInfo[]>('/auth/workspaces'),

  deleteWorkspace: (workspaceId: string) =>
    client.delete(`/auth/workspaces/${workspaceId}`),

  // ── Workspace member management ────────────────────────────────────────────
  listMembers: (workspaceId: string) =>
    client.get<WorkspaceMember[]>(`/admin/workspaces/${workspaceId}/members`),

  addMember: (workspaceId: string, userId: string, role = 'employee') =>
    client.post(`/admin/workspaces/${workspaceId}/members`, { user_id: userId, role }),

  removeMember: (workspaceId: string, userId: string) =>
    client.delete(`/admin/workspaces/${workspaceId}/members/${userId}`),

  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    client.patch(`/admin/workspaces/${workspaceId}/members/${userId}`, { user_id: userId, role }),

  // ── Group management ───────────────────────────────────────────────────────
  listGroups: (workspaceId: string) =>
    client.get<Group[]>(`/workspaces/${workspaceId}/groups`),

  createGroup: (workspaceId: string, name: string) =>
    client.post<Group>(`/workspaces/${workspaceId}/groups`, { name }),

  addGroupMember: (workspaceId: string, groupId: string, userId: string) =>
    client.post(`/workspaces/${workspaceId}/groups/${groupId}/members`, { user_id: userId }),

  removeGroupMember: (workspaceId: string, groupId: string, userId: string) =>
    client.delete(`/workspaces/${workspaceId}/groups/${groupId}/members/${userId}`),
};
