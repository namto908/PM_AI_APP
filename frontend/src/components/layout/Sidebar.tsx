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
      setWorkspaces(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const activeWs = Array.isArray(workspaces) ? workspaces.find((w) => w.id === activeWorkspaceId) : undefined;
  const roleCfg = ROLE_DISPLAY[user?.system_role ?? 'employee'];

  return (
    <aside className="w-60 h-full flex-shrink-0 bg-surface border-r border-outline-variant flex flex-col">
      <div className="px-6 py-8 font-bold text-xl text-on-surface select-none">
        TaskOps <span className="text-primary font-black">AI</span>
      </div>

      {/* Workspace selector */}
      <div className="px-4 mb-6 relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container hover:brightness-95 transition-all text-left shadow-sm border border-outline-variant/30"
        >
          <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-on-primary-fixed text-[10px] font-black flex-shrink-0">
            {(activeWs?.name?.[0] ?? 'W').toUpperCase()}
          </div>
          <span className="text-sm font-bold text-on-surface truncate flex-1">
            {activeWs?.name ?? 'Select workspace'}
          </span>
          <ChevronDown size={14} className="text-on-surface-variant/50" />
        </button>
        {open && workspaces.length > 0 && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-surface border border-outline-variant rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws.id); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  ws.id === activeWorkspaceId
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {ws.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Nav Items - Grows to fill space */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-on-primary-fixed font-bold shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Dynamic section border */}
        <div className="my-4 mx-3 border-t border-outline-variant/30" />

        {/* Workspaces: For Managers and Superadmins */}
        {(user?.system_role === 'superadmin' || user?.system_role === 'manager') && (
          <NavLink
            to="/workspaces"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-on-primary-fixed font-bold shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-on-primary-fixed font-bold shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-secondary text-on-secondary-fixed font-bold shadow-md shadow-secondary/20'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`
            }
          >
            <Shield size={18} />
            Team Management
          </NavLink>
        )}
      </nav>

      {/* User Profile + Settings - Stay at the bottom */}
      <div className="p-4 mt-auto border-t border-outline-variant/30 bg-surface-container/20">
        {user && roleCfg && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-surface border border-outline-variant shadow-sm mb-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-xs font-black text-on-surface shadow-inner">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
              <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${roleCfg.color}`}>{roleCfg.label}</p>
            </div>
          </div>
        )}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              isActive
                ? 'bg-primary/10 text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
