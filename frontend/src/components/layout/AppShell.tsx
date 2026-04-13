import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import client from '@/api/client';

export default function AppShell() {
  const token = useAuthStore((s) => s.token);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) return;

    const safeRoutes = ['/workspaces', '/settings', '/admin/users', '/manager/team'];
    const isSafeRoute = safeRoutes.includes(location.pathname);

    client.get('/auth/workspaces').then(({ data }) => {
      if (data.length > 0) {
        // Auto-select first workspace if none selected or stored one is stale
        if (!activeWorkspaceId || !data.find((w: any) => w.id === activeWorkspaceId)) {
          setActiveWorkspace(data[0].id);
        }
      } else {
        // If no workspaces and trying to access a restricted page, redirect
        if (!isSafeRoute) {
          navigate('/workspaces', { replace: true });
        }
      }
    }).catch(() => {
      // silently fall through — token may be expired
    }).finally(() => {
      setBooting(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  if (!token) return <Navigate to="/login" replace />;

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-low">
      <div className="relative z-20 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
