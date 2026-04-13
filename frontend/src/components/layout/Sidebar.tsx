import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Server,
  MessageSquare,
  Settings,
  ChevronDown,
  Users,
  Shield,
  Building2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { adminApi } from '@/api/admin';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/monitoring', icon: Server, label: 'Monitoring' },
  { to: '/ai', icon: MessageSquare, label: 'AI Chat' },
];

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  superadmin: { label: 'Superadmin', color: 'text-amber-400' },
  manager:    { label: 'Manager',    color: 'text-teal-400' },
  employee:   { label: 'Employee',   color: 'text-sky-400' },
  guest:      { label: 'Guest',      color: 'text-violet-400' },
};

export default function Sidebar() {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const user = useAuthStore((s) => s.user);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    adminApi.listWorkspaces().then(({ data }) => {
      setWorkspaces(data);
    }).catch(() => {});
  }, []);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const roleCfg = ROLE_DISPLAY[user?.system_role ?? 'employee'];

  return (
    <aside className="w-60 flex-shrink-0 bg-surface border-r border-outline-variant flex flex-col">
      <div className="px-4 py-5 font-bold text-xl text-on-surface select-none">
        TaskOps <span className="text-indigo-500">AI</span>
      </div>

      {/* Workspace selector */}
      <div className="px-3 mb-3 relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-left"
        >
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-on-primary-fixed text-[10px] font-bold flex-shrink-0">
            {(activeWs?.name?.[0] ?? 'W').toUpperCase()}
          </div>
          <span className="text-sm font-medium text-on-surface truncate flex-1">
            {activeWs?.name ?? 'Select workspace'}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        {open && workspaces.length > 0 && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-surface border border-outline-variant rounded-lg shadow-lg z-10 py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  ws.id === activeWorkspaceId
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {ws.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Workspaces: For Managers and Superadmins */}
        {(user?.system_role === 'superadmin' || user?.system_role === 'manager') && (
          <NavLink
            to="/workspaces"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`
            }
          >
            <Building2 size={18} />
            Workspaces
          </NavLink>
        )}

        {/* Superadmin: Full User Management */}
        {user?.system_role === 'superadmin' && (
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`
            }
          >
            <Users size={18} />
            User Management
          </NavLink>
        )}

        {/* Manager: Team Management (employee/guest only) */}
        {user?.system_role === 'manager' && (
          <NavLink
            to="/manager/team"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`
            }
          >
            <Shield size={18} />
            Team Management
          </NavLink>
        )}
      </nav>

      {/* Role Badge + Settings */}
      <div className="p-3 space-y-1">
        {/* Current role indicator */}
        {user && roleCfg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant mb-1">
            <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-on-surface">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">{user.name}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${roleCfg.color}`}>{roleCfg.label}</p>
            </div>
          </div>
        )}
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container"
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
