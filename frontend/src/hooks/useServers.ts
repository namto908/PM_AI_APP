import { useState, useEffect } from 'react';
import { serversApi, type Server } from '@/api/servers';

export function useServers(workspaceId: string | null) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    serversApi
      .list(workspaceId)
      .then((res) => setServers(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load servers'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return { servers, loading, error };
}
