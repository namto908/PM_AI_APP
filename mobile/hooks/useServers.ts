import { useState, useEffect, useCallback } from 'react';
import { serversApi, type Server } from '../api/servers';

export function useServers(workspaceId: string | null) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await serversApi.list(workspaceId);
      setServers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return { servers, loading, error, refetch: fetchServers };
}
