import { useState } from 'react';
import {
  Plus, X, MoreHorizontal, Calendar, Zap, AlertTriangle, ChevronDown,
  Filter, Kanban, List, CheckSquare,
} from 'lucide-react';
import { DndContext, DragOverlay, closestCorners, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTasks } from '@/hooks/useTasks';
import { tasksApi, type Task, type TaskCreate } from '@/api/tasks';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: 'todo',        label: 'Todo',        badge: 'bg-input text-slate-600 dark:text-slate-400' },
  { key: 'in_progress', label: 'In Progress', badge: 'bg-[#6bd8cb]/20 text-[#6bd8cb]' },
  { key: 'in_review',   label: 'Review',      badge: 'bg-input text-slate-600 dark:text-slate-400' },
  { key: 'done',        label: 'Done',        badge: 'bg-teal-500/10 text-teal-400' },
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const PRIORITY_TAG: Record<string, string> = {
  low:    'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  medium: 'bg-[#b4c5ff]/10 text-[#b4c5ff] border border-[#b4c5ff]/20',
  high:   'bg-[#ffb59a]/10 text-[#ffb59a] border border-[#ffb59a]/20',
  urgent: 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20',
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCardContent({ task, isActive, isDragging = false }: { task: Task; isActive: boolean; isDragging?: boolean }) {
  const isInProgress = task.status === 'in_progress';
  const isDone = task.status === 'done';

  return (
    <div
      className={[
        'p-4 rounded-2xl transition-all group select-none',
        isDragging ? 'shadow-2xl shadow-[#6bd8cb]/20 scale-[1.03] rotate-1 ring-1 ring-[#6bd8cb]/40' : '',
        isDone
          ? 'bg-white dark:bg-card/50 border border-slate-200 dark:border-slate-800/40 grayscale hover:grayscale-0 opacity-80'
          : isInProgress
          ? 'bg-white dark:bg-card border-l-4 border-[#6bd8cb] ring-1 ring-[#6bd8cb]/10 hover:bg-slate-50 dark:hover:bg-card2 shadow-sm'
          : 'bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-card2 shadow-sm border border-slate-200 dark:border-transparent',
        isActive ? 'ring-2 ring-[#6bd8cb]/60' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${PRIORITY_TAG[task.priority]}`}>
          {task.priority}
        </span>
        {isDone
          ? <CheckSquare size={14} className="text-teal-500" />
          : <MoreHorizontal size={14} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400" />
        }
      </div>

      <h4 className={`text-sm font-semibold mb-3 leading-snug ${isDone ? 'text-slate-500 line-through' : 'text-text1'}`}>
        {task.title}
      </h4>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {task.assignee_id && (
            <div className="w-6 h-6 rounded-full bg-[#6bd8cb]/20 border-2 border-card flex items-center justify-center text-[9px] font-bold text-[#6bd8cb]">A</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {task.due_date && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-500">
              <Calendar size={10} />{fmtDate(task.due_date)}
            </div>
          )}
          {task.priority === 'urgent' && <Zap size={12} className="text-[#ffb4ab]" />}
          {task.priority === 'high' && <AlertTriangle size={12} className="text-[#ffb59a]" />}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, isActive, onClick }: { task: Task; isActive: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`touch-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <TaskCardContent task={task} isActive={isActive} isDragging={false} />
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, activeId, onCardClick, onAddClick }: {
  col: typeof KANBAN_COLUMNS[number];
  tasks: Task[];
  activeId: string | null;
  onCardClick: (t: Task) => void;
  onAddClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.key });

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-text1 text-sm uppercase tracking-widest">{col.label}</h3>
          <span className={`${col.badge} px-2 py-0.5 rounded text-[10px] font-semibold`}>{tasks.length}</span>
        </div>
        <button onClick={onAddClick} className="text-slate-400 dark:text-slate-500 hover:text-[#6bd8cb] transition-colors">
          <Plus size={14} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-4 min-h-[80px] rounded-2xl p-1.5 transition-all ${
          isOver ? 'bg-[#6bd8cb]/5 ring-1 ring-[#6bd8cb]/20' : ''
        }`}
      >
        {tasks.length === 0 && (
          <div className={`border border-dashed rounded-2xl p-6 text-center transition-colors ${
            isOver ? 'border-[#6bd8cb]/30 bg-[#6bd8cb]/5' : 'bg-card/40 border-slate-300 dark:border-slate-800'
          }`}>
            <p className="text-[11px] text-slate-400 dark:text-slate-600">No tasks</p>
          </div>
        )}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} isActive={activeId === t.id} onClick={() => onCardClick(t)} />
        ))}
      </div>
    </div>
  );
}

// ─── List Row ────────────────────────────────────────────────────────────────

function ListRow({ task, isActive, onClick }: { task: Task; isActive: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${isActive ? 'bg-[#6bd8cb]/5' : 'hover:bg-card2'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text1 truncate">{task.title}</p>
        {task.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{task.description}</p>}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter flex-shrink-0 ${PRIORITY_TAG[task.priority]}`}>
        {task.priority}
      </span>
      {task.due_date && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
          <Calendar size={10} />{fmtDate(task.due_date)}
        </div>
      )}
    </div>
  );
}



// ─── Create Task Modal ───────────────────────────────────────────────────────

function CreateTaskModal({ workspaceId, onCreated, onClose }: {
  workspaceId: string; onCreated: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState<TaskCreate>({ title: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const set = (patch: Partial<TaskCreate>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await tasksApi.create(workspaceId, form); onCreated(); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/30 p-8 w-full max-w-md shadow-2xl animate-in slide-in-from-top-8 duration-500">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl text-text1">Create Task</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-text1 p-1.5 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500 mb-1.5">Title *</label>
            <input
              autoFocus type="text" value={form.title}
              onChange={(e) => set({ title: e.target.value })} required
              placeholder="Task title..."
              className="w-full bg-input border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 text-sm text-text1 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Description</label>
            <textarea
              rows={3} value={form.description ?? ''}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Optional description..."
              className="w-full bg-input border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 text-sm text-text1 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => set({ priority: e.target.value })}
                className="w-full bg-input border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 text-sm text-text1 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Due Date</label>
              <input type="date" value={form.due_date ?? ''}
                onChange={(e) => set({ due_date: e.target.value || undefined })}
                className="w-full bg-input border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 text-sm text-text1 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm text-slate-400 hover:text-text1 hover:bg-card2 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-[#6bd8cb] text-[#003732] font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#6bd8cb]/10 hover:shadow-[#6bd8cb]/20 transition-all disabled:opacity-50">
              <Plus size={16} />
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Task['status']>>({});

  // Require 8px movement before drag activates — preserves click-to-open behavior
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data, loading, error, refetch } = useTasks(workspaceId, { top_level_only: true });
  const rawTasks = (data?.items ?? []).filter(
    (t) => t.status !== 'cancelled' && (!filterPriority || t.priority === filterPriority)
  );
  // Apply optimistic overrides so drag feedback is instant
  const tasks = rawTasks.map((t) => ({
    ...t,
    status: statusOverrides[t.id] ?? t.status,
  }));

  const byStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleCardClick = (task: Task) =>
    setActiveTask((prev) => (prev?.id === task.id ? null : task));

  const handleDragStart = (event: DragStartEvent) => {
    const found = rawTasks.find((t) => t.id === event.active.id);
    setDraggingTask(found ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = event;
    if (!over || !workspaceId) return;
    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentStatus = statusOverrides[taskId] ?? task.status;
    if (currentStatus === newStatus) return;
    setStatusOverrides((prev) => ({ ...prev, [taskId]: newStatus }));
    try {
      await tasksApi.update(workspaceId, taskId, { status: newStatus });
      await refetch();
      setStatusOverrides((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
    } catch {
      setStatusOverrides((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="font-bold text-3xl tracking-tight text-text1 mb-1">Task Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage project workflows and individual sprint tasks.</p>
        </div>
        <div className="flex items-center bg-card p-1 rounded-xl">
          {(['kanban', 'list'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === v ? 'bg-input text-[#6bd8cb] shadow-lg' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {v === 'kanban' ? <Kanban size={14} /> : <List size={14} />}
              <span className="text-xs font-bold uppercase tracking-wider">{v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-card/50 p-3 rounded-2xl flex-shrink-0">
        <div className="relative flex items-center gap-2 px-3 py-2 bg-card2 rounded-xl text-sm border border-slate-200 dark:border-slate-800/20">
          <span className="text-slate-600 dark:text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Priority:</span>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-transparent border-none text-text1 text-xs focus:outline-none cursor-pointer pr-4 appearance-none">
            <option value="">All</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <ChevronDown size={12} className="text-slate-400 dark:text-slate-500 pointer-events-none absolute right-2" />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-card2 rounded-xl text-sm border border-slate-200 dark:border-slate-800/20">
          <span className="text-slate-600 dark:text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Due Date:</span>
          <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {filterPriority && (
            <button onClick={() => setFilterPriority('')}
              className="flex items-center gap-2 text-slate-400 hover:text-text1 px-3 py-2 text-sm transition-colors">
              <Filter size={16} /> Clear Filters
            </button>
          )}
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-[#6bd8cb] text-[#003732] font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#6bd8cb]/10 hover:shadow-[#6bd8cb]/20 transition-all">
            <Plus size={16} /> Create Task
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <div className="w-4 h-4 border-2 border-[#6bd8cb] border-t-transparent rounded-full animate-spin" />
          Loading tasks...
        </div>
      )}
      {error && <p className="text-sm text-[#ffb4ab] mb-4">{error}</p>}

      {/* Kanban */}
      {view === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start min-w-[800px] pb-6">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn key={col.key} col={col} tasks={byStatus[col.key] ?? []}
                  activeId={activeTask?.id ?? null}
                  onCardClick={handleCardClick}
                  onAddClick={() => setCreateOpen(true)}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {draggingTask && (
              <TaskCardContent task={draggingTask} isActive={false} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* List */}
      {view === 'list' && (
        <div className="flex-1 overflow-auto">
          <div className="bg-card rounded-2xl border border-slate-800/20 divide-y divide-slate-800/30 overflow-hidden">
            {tasks.length === 0 && !loading && (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-500">No tasks yet.</p>
                <button onClick={() => setCreateOpen(true)} className="mt-3 text-sm text-[#6bd8cb] hover:underline">
                  Create your first task
                </button>
              </div>
            )}
            {tasks.map((t) => (
              <ListRow key={t.id} task={t} isActive={activeTask?.id === t.id} onClick={() => handleCardClick(t)} />
            ))}
          </div>
        </div>
      )}

      {activeTask && workspaceId && (
        <>
          <div 
            className="fixed inset-0 bg-black/5 z-40 backdrop-blur-[1px] animate-in fade-in duration-300"
            onClick={() => setActiveTask(null)}
          />
          <TaskDetailPanel task={activeTask} workspaceId={workspaceId}
            onClose={() => setActiveTask(null)}
            onUpdated={() => { refetch(); setActiveTask(null); }}
          />
        </>
      )}

      {createOpen && workspaceId && (
        <CreateTaskModal workspaceId={workspaceId} onCreated={refetch} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
