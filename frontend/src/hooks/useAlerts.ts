import { useState, useEffect } from 'react';
import { alertsApi, type Alert } from '@/api/alerts';

export function useAlerts(workspaceId: string | null, resolved = false) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    alertsApi
      .list(workspaceId, resolved)
      .then((res) => setAlerts(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load alerts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [workspaceId, resolved]);

  const resolve = async (alertId: string) => {
    if (!workspaceId) return;
    await alertsApi.resolve(workspaceId, alertId);
    load();
  };

  return { alerts, loading, error, resolve, refetch: load };
}
