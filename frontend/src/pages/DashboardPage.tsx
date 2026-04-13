import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bell, ChevronRight, Cpu, Database,
  RefreshCw, Server, Zap, Bot, ClipboardList,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTasks } from '@/hooks/useTasks';
import { useAlerts } from '@/hooks/useAlerts';
import { useServers } from '@/hooks/useServers';
import { useState, useEffect } from 'react';
import { InlineTaskDetail } from '@/components/tasks/InlineTaskDetail';
import type { Task } from '@/api/tasks';
import type { Alert } from '@/api/alerts';


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
        <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{label}</p>
        <h3 className={`text-4xl font-bold ${color}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
        <Icon size={28} className={color} />
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────── 

function TaskRow({ task, isToday, isOverdue, onClick }: { task: Task; isToday?: boolean; isOverdue?: boolean; onClick?: () => void }) {
  const iconMap: Record<string, React.ElementType> = {
    urgent: AlertTriangle, high: Zap, medium: RefreshCw, low: ClipboardList,
  };
  const colorMap: Record<string, string> = {
    urgent: 'text-tertiary', high: 'text-tertiary', medium: 'text-primary', low: 'text-on-surface-variant',
  };
  const badgeMap: Record<string, string> = {
    urgent: 'bg-tertiary/10 text-tertiary',
    high: 'bg-tertiary/10 text-tertiary',
    medium: 'bg-primary/10 text-primary',
    low: 'bg-surface-container-highest text-on-surface-variant',
  };
  const Icon = iconMap[task.priority] ?? ClipboardList;
  return (
    <div onClick={onClick} className={`p-4 flex items-center gap-4 hover:bg-card2 transition-colors cursor-pointer ${isToday ? 'bg-card2/30 border-l-4 border-l-[#6bd8cb]' : isOverdue ? 'bg-[#ffb4ab]/5 border-l-4 border-l-[#ffb4ab]' : 'border-l-4 border-l-transparent'}`}>
      <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 shadow-inner">
        <Icon size={18} className={colorMap[task.priority]} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-bold text-on-surface truncate">{task.title}</h4>
          {isToday && <span className="bg-primary/20 text-primary text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider">Today</span>}
          {isOverdue && <span className="bg-error/20 text-error text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider">Overdue</span>}
        </div>
        <p className="text-xs text-on-surface-variant truncate">
          {task.due_date ? `Due ${task.due_date}` : 'No due date'} · {task.status.replace(/_/g, ' ')}
        </p>
      </div>
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${badgeMap[task.priority]}`}>
        {task.priority}
      </span>
    </div>
  );
}

// ─── Task Accordion Row ─────────────────────────────────────────────────────────────

function TaskAccordionRow({ task, isToday, isOverdue, workspaceId, isOpen, onClick }: {
  task: Task; isToday: boolean; isOverdue: boolean; workspaceId: string; isOpen: boolean; onClick: () => void;
}) {
  const [shouldRender, setRender] = useState(isOpen);

  useEffect(() => {
    let timeoutId: number;
    if (isOpen) {
      setRender(true);
    } else {
      timeoutId = window.setTimeout(() => setRender(false), 500);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  return (
    <div className="flex flex-col border-b border-outline-variant/30 last:border-0">
      <div
        className={`${isOpen ? 'bg-surface-container/40' : ''} transition-colors duration-500 cursor-pointer`}
        onClick={onClick}
      >
        <TaskRow
          task={task}
          isToday={isToday}
          isOverdue={isOverdue}
        />
      </div>
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}>
        <div className="overflow-hidden">
          {shouldRender && (
            <div className="p-4 bg-surface-container/20 border-t border-outline-variant/40">
              <InlineTaskDetail
                task={task}
                workspaceId={workspaceId}
              />
            </div>
          )}
        </div>
      </div>
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
        <span className="text-[10px] text-on-surface-variant ml-2 flex-shrink-0">{fmtTime(alert.created_at)}</span>
      </div>
      {alert.message && (
        <p className="text-[11px] text-on-surface-variant mb-2">{alert.message}</p>
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
            className="text-[10px] font-bold bg-surface-container-highest text-on-surface-variant px-2 py-1 rounded hover:bg-surface-container"
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
  const { data: tasks } = useTasks(workspaceId, { page_size: 50, top_level_only: true });
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { alerts, resolve } = useAlerts(workspaceId, false);
  const { servers } = useServers(workspaceId);

  const todayStr = new Date().toISOString().split('T')[0];
  const openTasks = tasks?.items.filter(t => t.status !== 'done') ?? [];
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < todayStr);
  const todayTasks = openTasks.filter((t) => t.due_date === todayStr);
  const otherTasks = openTasks.filter((t) => !t.due_date || t.due_date > todayStr);
  const prioritizedTasks = [...todayTasks, ...overdueTasks, ...otherTasks];

  const pendingAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const downServers = servers.filter((s) => !s.is_active);

  if (!workspaceId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
        <p className="text-on-surface-variant font-medium">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard label="Overdue Tasks" value={String(overdueTasks.length).padStart(2, '0')} icon={AlertTriangle} color="text-tertiary" />
        <KpiCard label="Pending Alerts" value={String(pendingAlerts.length).padStart(2, '0')} icon={Bell} color="text-primary" />
        <KpiCard label="Down Services" value={String(downServers.length).padStart(2, '0')} icon={Server} color="text-error" border />
      </div>

      {/* Asymmetric 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left — task list */}
        <div className="xl:col-span-2 space-y-8">
          {/* Main Tasks list */}
          <div className="bg-surface rounded-xl overflow-hidden shadow-sm border border-outline-variant divide-y divide-outline-variant/30">
            <div className="px-6 py-5 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container/10">
              <div>
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <ClipboardList size={18} className="text-primary" />
                  Open Tasks
                </h2>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Prioritizing Today's Action Items</p>
              </div>
              <button
                onClick={() => navigate('/tasks')}
                className="text-[#6bd8cb] text-[10px] uppercase font-bold tracking-widest hover:bg-[#6bd8cb]/10 px-3 py-1.5 rounded transition-colors"
              >
                View Full Board
              </button>
            </div>
              <div className="divide-y divide-outline-variant/20 max-h-[800px] overflow-y-auto custom-scrollbar">
                {prioritizedTasks.length === 0 && (
                  <div className="p-8 text-center text-on-surface-variant text-sm font-medium">
                  <div className="inline-flex w-12 h-12 rounded-full bg-surface-container-highest items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-xl">DONE</span>
                  </div>
                  <p>No open tasks right now. Great job!</p>
                </div>
              )}
              {prioritizedTasks.map((task) => (
                <TaskAccordionRow
                  key={task.id}
                  task={task}
                  isToday={task.due_date === todayStr}
                  isOverdue={task.due_date ? task.due_date < todayStr : false}
                  workspaceId={workspaceId!}
                  isOpen={activeTask?.id === task.id}
                  onClick={() => setActiveTask(activeTask?.id === task.id ? null : task)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right — server info, charts + alerts */}
        <div className="space-y-8">

          {/* Quick actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/tasks')}
              className="w-full flex items-center justify-between p-4 bg-primary text-on-primary-fixed rounded-xl font-bold group hover:opacity-90 transition-all shadow-md shadow-primary/10"
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={20} />
                <span>Create Task</span>
              </div>
              <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => navigate('/monitoring')}
              className="w-full flex items-center justify-between p-4 bg-surface text-on-surface rounded-xl font-bold border border-outline-variant hover:bg-surface-container transition-all group"
            >
              <div className="flex items-center gap-3">
                <Cpu size={20} className="text-primary" />
                <span>Check Monitoring</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
            <button
              onClick={() => navigate('/ai')}
              className="w-full flex items-center justify-between p-4 bg-surface text-on-surface rounded-xl font-bold border border-outline-variant hover:bg-surface-container transition-all group"
            >
              <div className="flex items-center gap-3">
                <Bot size={20} className="text-secondary" />
                <span>Ask AI Assistant</span>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>

          {/* Critical alerts */}
          <div className="bg-surface rounded-xl overflow-hidden border border-outline-variant">
            <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container/10">
              <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Bell size={14} className="text-error" /> Active Alerts
              </h2>
              <button
                onClick={() => navigate('/monitoring')}
                className="text-error text-xs font-bold hover:underline"
              >
                View
              </button>
            </div>
            <div className="p-2 space-y-1">
              {pendingAlerts.length === 0 && (
                <p className="text-sm text-on-surface-variant font-medium p-3 text-center">All systems nominal.</p>
              )}
              {pendingAlerts.slice(0, 3).map((alert) => (
                <AlertRow key={alert.id} alert={alert} onResolve={() => resolve(alert.id)} />
              ))}
            </div>
          </div>

          {/* Active workspace card */}
          <div className="bg-surface p-6 rounded-xl relative overflow-hidden border border-outline-variant shadow-inner group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none group-hover:from-secondary/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[14px] text-secondary">hub</span>
                <p className="text-[10px] uppercase tracking-widest font-bold text-secondary">Overview</p>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-1">Architecture Snapshot</h3>
              <p className="text-[11px] text-on-surface-variant font-medium mb-5">Summary of cluster infrastructure.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm py-1 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Database size={14} className="text-secondary" />
                    Total tasks tracked
                  </div>
                  <span className="font-bold text-on-surface">{tasks?.total ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Server size={14} className="text-primary" />
                    Active servers
                  </div>
                  <span className="font-bold text-on-surface">{servers.filter((s) => s.is_active).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <AlertTriangle size={14} className="text-error" />
                    Critical alerts
                  </div>
                  <span className="font-bold text-error">{criticalAlerts.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
