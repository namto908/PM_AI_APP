import { useState } from 'react';
import {
  Plus, X, MoreHorizontal, Calendar, Zap, AlertTriangle, ChevronDown,
  Filter, Kanban, List, CheckSquare, Trash2, RotateCcw,
} from 'lucide-react';
import { DndContext, DragOverlay, closestCorners, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTasks } from '@/hooks/useTasks';
import { tasksApi, type Task, type TaskCreate } from '@/api/tasks';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { usePermissions } from '@/hooks/usePermissions';

// ─── Helpers ────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { key: 'todo',        label: 'Todo',        badge: 'bg-surface-container-highest text-on-surface-variant' },
  { key: 'in_progress', label: 'In Progress', badge: 'bg-primary/20 text-primary' },
  { key: 'in_review',   label: 'Review',      badge: 'bg-surface-container-highest text-on-surface-variant' },
  { key: 'done',        label: 'Done',        badge: 'bg-teal-500/10 text-teal-400' },
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const PRIORITY_TAG: Record<string, string> = {
  low:    'bg-surface-container-highest text-on-surface-variant',
  medium: 'bg-secondary/10 text-secondary border border-secondary/20',
  high:   'bg-tertiary/10 text-tertiary border border-tertiary/20',
  urgent: 'bg-error/10 text-error border border-error/20',
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
          ? 'bg-surface/50 border border-outline-variant grayscale hover:grayscale-0 opacity-80'
          : isInProgress
          ? 'bg-surface border-l-4 border-primary ring-1 ring-primary/10 hover:bg-surface-container shadow-sm'
          : 'bg-surface hover:bg-surface-container shadow-sm border border-outline-variant/30',
        isActive ? 'ring-2 ring-primary/60' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter ${PRIORITY_TAG[task.priority]}`}>
          {task.priority}
        </span>
        {isDone
          ? <CheckSquare size={14} className="text-teal-500" />
          : <MoreHorizontal size={14} className="text-on-surface-variant group-hover:text-on-surface" />
        }
      </div>

      <h4 className={`text-sm font-semibold mb-3 leading-snug ${isDone ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
        {task.title}
      </h4>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {task.creator_avatar ? (
            <img src={task.creator_avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border-2 border-surface shadow-sm" title={task.creator_name || 'Owner'} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-surface flex items-center justify-center text-[9px] font-bold text-primary shadow-sm" title={task.creator_name || 'Owner'}>
              {task.creator_name ? task.creator_name.charAt(0).toUpperCase() : '—'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {task.due_date && (
            <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <Calendar size={10} />{fmtDate(task.due_date)}
            </div>
          )}
          {task.priority === 'urgent' && <Zap size={12} className="text-error" />}
          {task.priority === 'high' && <AlertTriangle size={12} className="text-tertiary" />}
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
          <h3 className="font-bold text-on-surface text-sm uppercase tracking-widest">{col.label}</h3>
          <span className={`${col.badge} px-2 py-0.5 rounded text-[10px] font-semibold`}>{tasks.length}</span>
        </div>
        <button onClick={onAddClick} className="text-on-surface-variant hover:text-primary transition-colors">
          <Plus size={14} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-4 min-h-[80px] rounded-2xl p-1.5 transition-all ${
          isOver ? 'bg-primary/5 ring-1 ring-primary/20' : ''
        }`}
      >
        {tasks.length === 0 && (
          <div className={`border border-dashed rounded-2xl p-6 text-center transition-colors ${
            isOver ? 'border-primary/30 bg-primary/5' : 'bg-surface/40 border-outline-variant'
          }`}>
            <p className="text-[11px] text-on-surface-variant">No tasks</p>
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
      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${isActive ? 'bg-primary/5' : 'hover:bg-surface-container'}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate">{task.title}</p>
        {task.description && <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{task.description}</p>}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter flex-shrink-0 ${PRIORITY_TAG[task.priority]}`}>
        {task.priority}
      </span>
      {task.due_date && (
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant flex-shrink-0">
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
      <div className="bg-surface rounded-2xl border border-outline-variant p-8 w-full max-w-md shadow-2xl animate-in slide-in-from-top-8 duration-500">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl text-on-surface">Create Task</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Title *</label>
            <input
              autoFocus type="text" value={form.title}
              onChange={(e) => set({ title: e.target.value })} required
              placeholder="Task title..."
              className="w-full bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Description</label>
            <textarea
              rows={3} value={form.description ?? ''}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Optional description..."
              className="w-full bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => set({ priority: e.target.value })}
                className="w-full bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                {PRIORITIES.map((p) => <option key={p} value={p} className="bg-surface">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Due Date</label>
              <input type="date" value={form.due_date ?? ''}
                onChange={(e) => set({ due_date: e.target.value || undefined })}
                className="w-full bg-surface-container-highest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-primary text-on-primary-fixed font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all disabled:opacity-50">
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
  const [view, setView] = useState<'kanban' | 'list' | 'trash'>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Task['status']>>({});
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { canRestoreTask, canWriteTasks } = usePermissions();

  // Require 8px movement before drag activates — preserves click-to-open behavior
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data, loading, error, refetch } = useTasks(workspaceId, { top_level_only: true });
  const rawTasks = (data?.items ?? []).filter(
    (t) => !filterPriority || t.priority === filterPriority
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

  const loadTrash = async () => {
    if (!workspaceId) return;
    setTrashLoading(true);
    try {
      const res = await tasksApi.listTrash(workspaceId);
      setTrashTasks(res.data);
    } catch {
      setTrashTasks([]);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    if (!workspaceId) return;
    setRestoringId(taskId);
    try {
      await tasksApi.restore(workspaceId, taskId);
      await loadTrash();
      await refetch();
    } finally {
      setRestoringId(null);
    }
  };

  const handleViewChange = (v: 'kanban' | 'list' | 'trash') => {
    setView(v);
    if (v === 'trash') loadTrash();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="font-bold text-3xl tracking-tight text-on-surface mb-1">Task Management</h2>
          <p className="text-on-surface-variant text-sm">Manage project workflows and individual sprint tasks.</p>
        </div>
        <div className="flex items-center bg-surface p-1 rounded-xl border border-outline-variant/30">
          {(['kanban', 'list'] as const).map((v) => (
            <button key={v} onClick={() => handleViewChange(v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === v ? 'bg-surface-container-highest text-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'
              }`}>
              {v === 'kanban' ? <Kanban size={14} /> : <List size={14} />}
              <span className="text-xs font-bold uppercase tracking-wider">{v}</span>
            </button>
          ))}
          <button onClick={() => handleViewChange('trash')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              view === 'trash' ? 'bg-surface-container-highest text-error shadow-lg' : 'text-on-surface-variant hover:text-on-surface'
            }`}>
            <Trash2 size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Trash</span>
          </button>
        </div>
      </div>

      {/* Filter Bar — hide when viewing trash */}
      {view !== 'trash' && (
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-surface-container/50 p-3 rounded-2xl flex-shrink-0 border border-outline-variant/30">
          <div className="relative flex items-center gap-2 px-3 py-2 bg-surface-container rounded-xl text-sm border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-tighter">Priority:</span>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-none text-on-surface text-xs focus:outline-none cursor-pointer pr-4 appearance-none">
              <option value="" className="bg-surface">All</option>
              {PRIORITIES.map((p) => <option key={p} value={p} className="bg-surface">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <ChevronDown size={12} className="text-on-surface-variant pointer-events-none absolute right-2" />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-xl text-sm border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-tighter">Due Date:</span>
            <Calendar size={12} className="text-on-surface-variant" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {filterPriority && (
              <button onClick={() => setFilterPriority('')}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface px-3 py-2 text-sm transition-colors">
                <Filter size={16} /> Clear Filters
              </button>
            )}
            {canWriteTasks() && (
              <button onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 bg-primary text-on-primary-fixed font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                <Plus size={16} /> Create Task
              </button>
            )}
          </div>
        </div>
      )}

      {loading && view !== 'trash' && (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4 font-medium">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                  onAddClick={() => canWriteTasks() && setCreateOpen(true)}
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
          <div className="bg-surface rounded-2xl border border-outline-variant divide-y divide-outline-variant/30 overflow-hidden">
            {tasks.length === 0 && !loading && (
              <div className="py-16 text-center">
                <p className="text-sm text-on-surface-variant font-medium">No tasks yet.</p>
                {canWriteTasks() && (
                  <button onClick={() => setCreateOpen(true)} className="mt-3 text-sm text-primary font-bold hover:underline">
                    Create your first task
                  </button>
                )}
              </div>
            )}
            {tasks.map((t) => (
              <ListRow key={t.id} task={t} isActive={activeTask?.id === t.id} onClick={() => handleCardClick(t)} />
            ))}
          </div>
        </div>
      )}

      {/* Trash */}
      {view === 'trash' && (
        <div className="flex-1 overflow-auto">
          <div className="mb-4 flex items-center gap-3">
            <Trash2 size={16} className="text-error" />
            <h3 className="text-sm font-bold text-on-surface">
              {canRestoreTask() ? 'All deleted tasks (you can restore)' : 'Your deleted tasks'}
            </h3>
            <button onClick={loadTrash} className="ml-auto text-xs text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant">
              Refresh
            </button>
          </div>

          {trashLoading && (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4 font-medium">
              <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" />
              Loading trash...
            </div>
          )}

          {!trashLoading && trashTasks.length === 0 && (
            <div className="py-16 text-center bg-surface rounded-2xl border border-outline-variant">
              <Trash2 size={32} className="mx-auto text-on-surface-variant opacity-20 mb-3" />
              <p className="text-sm text-on-surface-variant font-medium">Trash is empty.</p>
            </div>
          )}

          {!trashLoading && trashTasks.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant divide-y divide-outline-variant/30 overflow-hidden">
              {trashTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate line-through opacity-40">{t.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Deleted: {new Date(t.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tighter flex-shrink-0 ${PRIORITY_TAG[t.priority]}`}>
                    {t.priority}
                  </span>
                  {canRestoreTask() && (
                    <button
                      onClick={() => handleRestoreTask(t.id)}
                      disabled={restoringId === t.id}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      <RotateCcw size={12} className={restoringId === t.id ? 'animate-spin' : ''} />
                      {restoringId === t.id ? 'Restoring...' : 'Restore'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTask && workspaceId && view !== 'trash' && (
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

      {createOpen && workspaceId && canWriteTasks() && (
        <CreateTaskModal workspaceId={workspaceId} onCreated={refetch} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
