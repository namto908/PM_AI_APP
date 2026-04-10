import client from './client';

export interface Server {
  id: string;
  workspace_id: string;
  name: string;
  hostname: string | null;
  ip_address: string | null;
  environment: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export const serversApi = {
  list: (workspaceId: string) =>
    client.get<Server[]>(`/ops/workspaces/${workspaceId}/servers`),
};
