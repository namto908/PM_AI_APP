import client from './client';

export interface Alert {
  id: string;
  workspace_id: string;
  server_id: string | null;
  service_id: string | null;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string | null;
  metric_name: string | null;
  metric_value: number | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export const alertsApi = {
  list: (workspaceId: string, resolved = false) =>
    client.get<Alert[]>(`/ops/workspaces/${workspaceId}/alerts`, { params: { resolved } }),

  resolve: (workspaceId: string, alertId: string) =>
    client.patch<Alert>(`/ops/workspaces/${workspaceId}/alerts/${alertId}/resolve`),
};
