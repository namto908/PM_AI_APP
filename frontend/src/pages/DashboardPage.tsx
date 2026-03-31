import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bell, ChevronRight, Cpu, Database,
  RefreshCw, Server, Zap, Bot, ClipboardList,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTasks } from '@/hooks/useTasks';
import { useAlerts } from '@/hooks/useAlerts';
import { useServers } from '@/hooks/useServers';
import type { Alert } from '@/api/alerts';
import type { Task } from '@/api/tasks';

// ─── Bar chart bars data ────────────────────────────────────────────────────

const CHART_BARS = [40, 60, 55, 85, 45, 30, 70, 90, 65, 50, 40, 60];

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, border,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  border?: boolean;
}) {
  return (
    <div className={`bg-card p-6 rounded-xl flex items-center justify-between hover:bg-card2 transition-colors${border ? ' border-l-4 border-[#ffb4ab]' : ''}`}>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{label}</p>
        <h3 className={`text-4xl font-bold ${color}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
        <Icon size={28} className={color} />
      </div>
    </div>
  );
}

// ─── Overdue task row ─────────────────────────────────────────────────────── 

function OverdueRow({ task }: { task: Task }) {
  const iconMap: Record<string, React.ElementType> = {
    urgent: AlertTriangle, high: Zap, medium: RefreshCw, low: ClipboardList,
  };
  const colorMap: Record<string, string> = {
    urgent: 'text-[#ffb59a]', high: 'text-[#ffb59a]', medium: 'text-slate-400', low: 'text-slate-400',
  };
  const badgeMap: Record<string, string> = {
    urgent: 'bg-[#ffb59a]/10 text-[#ffb59a]',
    high: 'bg-[#ffb59a]/10 text-[#ffb59a]',
    medium: 'bg-input text-slate-400',
    low: 'bg-input text-slate-400',
  };
  const Icon = iconMap[task.priority] ?? ClipboardList;
  return (
    <div className="p-4 flex items-center gap-4 hover:bg-card2 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-input flex items-center justify-center flex-shrink-0">
        <Icon size={18} className={colorMap[task.priority]} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-text1 truncate">{task.title}</h4>
        <p className="text-xs text-slate-500 truncate">
          {task.due_date ? `Due ${task.due_date}` : 'No due date'} · {task.status.replace(/_/g, ' ')}
        </p>
      </div>
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${badgeMap[task.priority]}`}>
        {task.priority}
      </span>
    </div>
  );
}

// ─── Alert row ───────────────────────────────────────────────────────────────

function AlertRow({ alert, onResolve }: { alert: Alert; onResolve: () => void }) {
  const isCritical = alert.severity === 'critical';
  const fmtTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div className={`p-3 rounded-lg ${isCritical ? 'bg-[#ffb4ab]/5 border-l-2 border-[#ffb4ab]' : 'bg-card2'}`}>
      <div className="flex items-start justify-between mb-1.5">
        <span className={`text-xs font-bold ${isCritical ? 'text-[#ffb4ab]' : 'text-[#ffb59a]'}`}>
          {alert.title}
        </span>
        <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">{fmtTime(alert.created_at)}</span>
      </div>
      {alert.message && (
        <p className="text-[11px] text-slate-300 mb-2">{alert.message}</p>
      )}
      {isCritical && (
        <div className="flex gap-2">
          <button
            onClick={onResolve}
            className="text-[10px] font-bold bg-[#ffb4ab] text-[#690005] px-2 py-1 rounded hover:opacity-90"
          >
            Resolve
          </button>
          <button
            onClick={onResolve}
            className="text-[10px] font-bold bg-input text-slate-400 px-2 py-1 rounded hover:bg-input2"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: tasks } = useTasks(workspaceId, { page_size: 10, status: 'todo' });
  const { alerts, resolve } = useAlerts(workspaceId, false);
  const { servers } = useServers(workspaceId);

  const overdueTasks = tasks?.items.filter((t) => t.due_date && new Date(t.due_date) < new Date()) ?? [];
  const pendingAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const downServers = servers.filter((s) => !s.is_active);

  if (!workspaceId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
        <p className="text-slate-400">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard label="Overdue Tasks"   value={String(overdueTasks.length).padStart(2, '0')} icon={AlertTriangle} color="text-[#ffb59a]" />
        <KpiCard label="Pending Alerts"  value={String(pendingAlerts.length).padStart(2, '0')} icon={Bell}         color="text-[#6bd8cb]" />
        <KpiCard label="Down Services"   value={String(downServers.length).padStart(2, '0')}  icon={Server}        color="text-[#ffb4ab]" border />
      </div>

      {/* Asymmetric 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left — chart + task list */}
        <div className="xl:col-span-2 space-y-8">

          {/* System Performance chart */}
          <div className="bg-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-text1">System Performance</h2>
                <p className="text-xs text-slate-500">24h telemetry overview across all clusters</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-card2 text-[10px] font-bold text-text1">
                  <span className="w-2 h-2 rounded-full bg-[#6bd8cb]" /> CPU
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-card2 text-[10px] font-bold text-text1">
                  <span className="w-2 h-2 rounded-full bg-[#b4c5ff]" /> RAM
                </span>
              </div>
            </div>
            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {CHART_BARS.map((pct, i) => (
                <div
                  key={i}
                  className="w-full rounded-t-sm bg-[#6bd8cb]/20 relative group overflow-hidden"
                  style={{ height: `${pct}%` }}
                >
                  <div className="absolute inset-0 bg-[#6bd8cb] opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Overdue tasks list */}
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/40">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Overdue Tasks</h2>
              <button
                onClick={() => navigate('/tasks')}
                className="text-[#6bd8cb] text-xs font-bold hover:underline"
              >
                View More
              </button>
            </div>
            <div className="divide-y divide-slate-800/20">
              {overdueTasks.length === 0 && tasks?.items.length === 0 && (
                <p className="text-sm text-slate-500 p-6">No tasks yet.</p>
              )}
              {(overdueTasks.length > 0 ? overdueTasks : tasks?.items.slice(0, 3) ?? []).map((task) => (
                <OverdueRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>

        {/* Right — quick actions + alerts + workspace */}
        <div className="space-y-8">

          {/* Quick actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/tasks')}
              className="w-full flex items-center justify-between p-4 bg-[#6bd8cb] text-[#003732] rounded-xl font-bold group hover:opacity-90 transition-all"
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={20} />
                <span>Create Task</span>
              </div>
              <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => navigate('/monitoring')}
              className="w-full flex items-center justify-between p-4 bg-card text-text1 rounded-xl font-bold border border-slate-800/40 hover:bg-card2 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Cpu size={20} className="text-[#6bd8cb]" />
                <span>Check Monitoring</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
            <button
              onClick={() => navigate('/ai')}
              className="w-full flex items-center justify-between p-4 bg-card text-text1 rounded-xl font-bold border border-slate-800/40 hover:bg-card2 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Bot size={20} className="text-[#b4c5ff]" />
                <span>Ask AI Assistant</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>

          {/* Critical alerts */}
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/40">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Critical Alerts</h2>
              <button
                onClick={() => navigate('/monitoring')}
                className="text-[#6bd8cb] text-xs font-bold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="p-2 space-y-1">
              {pendingAlerts.length === 0 && (
                <p className="text-sm text-slate-500 p-3">No active alerts.</p>
              )}
              {pendingAlerts.slice(0, 4).map((alert) => (
                <AlertRow key={alert.id} alert={alert} onResolve={() => resolve(alert.id)} />
              ))}
            </div>
          </div>

          {/* Active workspace card */}
          <div className="bg-card p-6 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6bd8cb]/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#6bd8cb] mb-2">Overview</p>
              <h3 className="text-lg font-bold text-text1 mb-1">Workspace Stats</h3>
              <p className="text-xs text-slate-400 mb-5">Summary of tasks, alerts and infrastructure.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Database size={14} className="text-[#b4c5ff]" />
                    Total tasks
                  </div>
                  <span className="font-bold text-text1">{tasks?.total ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Server size={14} className="text-[#6bd8cb]" />
                    Active servers
                  </div>
                  <span className="font-bold text-text1">{servers.filter((s) => s.is_active).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <AlertTriangle size={14} className="text-[#ffb4ab]" />
                    Critical alerts
                  </div>
                  <span className="font-bold text-[#ffb4ab]">{criticalAlerts.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
