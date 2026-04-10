import { useState, useEffect, useCallback } from 'react';
import { alertsApi, type Alert } from '../api/alerts';

export function useAlerts(workspaceId: string | null, resolved = false) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await alertsApi.list(workspaceId, resolved);
      setAlerts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, resolved]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (alertId: string) => {
    if (!workspaceId) return;
    await alertsApi.resolve(workspaceId, alertId);
    await load();
  };

  return { alerts, loading, error, resolve, refetch: load };
}
