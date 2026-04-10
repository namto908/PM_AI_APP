import { useState, useEffect, useCallback } from 'react';
import { tasksApi, type TaskFilter, type PaginatedTasks } from '../api/tasks';

export function useTasks(workspaceId: string | null, filters: TaskFilter = {}) {
  const [data, setData] = useState<PaginatedTasks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tasksApi.list(workspaceId, filters);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { data, loading, error, refetch: fetchTasks };
}
