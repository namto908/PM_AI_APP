import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Server,
  MessageSquare,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import client from '@/api/client';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/monitoring', icon: Server, label: 'Monitoring' },
  { to: '/ai', icon: MessageSquare, label: 'AI Chat' },
];

export default function Sidebar() {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    client.get('/auth/workspaces').then(({ data }) => {
      setWorkspaces(data);
    }).catch(() => {});
  }, []);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="px-4 py-5 font-bold text-xl text-gray-900 dark:text-white select-none">
        TaskOps <span className="text-indigo-500">AI</span>
      </div>

      {/* Workspace selector */}
      <div className="px-3 mb-3 relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-left"
        >
          <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {(activeWs?.name?.[0] ?? 'W').toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
            {activeWs?.name ?? 'Select workspace'}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        {open && workspaces.length > 0 && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  ws.id === activeWorkspaceId
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
