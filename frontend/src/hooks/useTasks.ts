import { useState, useEffect } from 'react';
import { tasksApi, type TaskFilter, type PaginatedTasks } from '@/api/tasks';

export function useTasks(workspaceId: string | null, filters: TaskFilter = {}) {
  const [data, setData] = useState<PaginatedTasks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    tasksApi
      .list(workspaceId, filters)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [workspaceId, filterKey]);

  const refetch = () => {
    if (!workspaceId) return Promise.resolve();
    setLoading(true);
    return tasksApi
      .list(workspaceId, filters)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  return { data, loading, error, refetch };
}
