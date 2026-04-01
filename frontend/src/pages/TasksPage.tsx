import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, MoreHorizontal, Calendar, Send, Zap, AlertTriangle, ChevronDown,
  Filter, Kanban, List, Trash2, Share2, CheckSquare, MessageSquare,
} from 'lucide-react';
import { DndContext, DragOverlay, closestCorners, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useTasks } from '@/hooks/useTasks';
import { tasksApi, type Task, type TaskCreate, type TaskComment, type TaskActivity } from '@/api/tasks';

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

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({ task, workspaceId, onClose, onUpdated }: {
  task: Task; workspaceId: string; onClose: () => void; onUpdated: () => void;
}) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingComments(true);
    Promise.all([
      tasksApi.getComments(workspaceId, task.id),
      tasksApi.getActivities(workspaceId, task.id)
    ])
      .then(([cRes, aRes]) => {
        setComments(cRes.data);
        setActivities(aRes.data);
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [workspaceId, task.id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await tasksApi.addComment(workspaceId, task.id, comment);
      setComments((prev) => [...prev, res.data]);
      setComment('');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await tasksApi.delete(workspaceId, task.id);
      onUpdated(); onClose();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const statusLabel: Record<string, string> = {
    todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[450px] bg-white dark:bg-[#131b2e] shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-50 border-l border-slate-200 dark:border-slate-800/20 flex flex-col">
      <div className="p-6 border-b border-slate-800/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-[#6bd8cb]" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Task Detail</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-slate-400 dark:text-slate-500 hover:text-text1 p-1.5 rounded-lg transition-colors"><Share2 size={16} /></button>
          <button onClick={() => setShowDeleteConfirm(true)} className="text-slate-400 dark:text-slate-500 hover:text-[#ffb4ab] p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-text1 p-1.5 rounded-lg ml-2 transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8" style={{ scrollbarWidth: 'none' }}>
        <div className="mb-8">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-tighter mb-4 inline-block ${PRIORITY_TAG[task.priority]}`}>
            {task.priority}
          </span>
          <h1 className="font-bold text-2xl text-text1 leading-tight mb-4">{task.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#6bd8cb]/20 flex items-center justify-center text-[9px] font-bold text-[#6bd8cb]">
                {task.assignee_id ? 'A' : '—'}
              </div>
              <span className="font-medium">{task.assignee_id ? 'Assigned' : 'Unassigned'}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <div 
              className="flex items-center gap-1.5 relative group cursor-pointer p-1.5 -m-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
              onClick={() => {
                try {
                  dateInputRef.current?.showPicker();
                } catch (e) {
                  // Fallback for older browsers
                  dateInputRef.current?.focus();
                  dateInputRef.current?.click();
                }
              }}
            >
              <Calendar size={14} />
              <input
                ref={dateInputRef}
                type="date"
                value={task.due_date ? task.due_date.split('T')[0] : ''}
                onChange={async (e) => {
                  try {
                    await tasksApi.update(workspaceId, task.id, { due_date: e.target.value || undefined });
                    onUpdated();
                  } catch {}
                }}
                className="absolute inset-x-0 bottom-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Change due date"
              />
              <span className="group-hover:text-slate-200 transition-colors">
                {task.due_date ? `Due ${fmtDate(task.due_date)}` : 'Set due date'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card2 p-4 rounded-xl border border-slate-200 dark:border-slate-800/20">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500 mb-2">Status</h5>
            <p className="text-sm text-text1/80 font-medium">{statusLabel[task.status] ?? task.status}</p>
          </div>

          {task.description && (
            <div className="bg-card2 p-4 rounded-xl border border-slate-200 dark:border-slate-800/20">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500 mb-2">Description</h5>
              <p className="text-sm text-text1/80 leading-relaxed">{task.description}</p>
            </div>
          )}

          <div className="bg-card2 p-4 rounded-xl border border-slate-200 dark:border-slate-800/20 space-y-2">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500 mb-2">Details</h5>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Created</span><span>{fmtDate(task.created_at)}</span></div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Updated</span><span>{fmtDate(task.updated_at)}</span></div>
            {task.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-[#6bd8cb]/10 text-[#6bd8cb] rounded-md font-medium">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div>
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500 mb-3 px-1">Activity</h5>
            <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
              <div className="relative mb-5">
                <span className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-[#6bd8cb]/20 border-2 border-[#6bd8cb] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb]" />
                </span>
                <div className="text-xs">
                  <span className="font-bold text-text1">Task created</span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">{fmtDate(task.created_at)}</p>
                </div>
              </div>

              {loadingComments && (
                <p className="text-[11px] text-slate-400 dark:text-slate-600 pl-1">Loading timeline...</p>
              )}

              {(() => {
                const timelineEvents = [...comments.map(c => ({ ...c, _type: 'comment' })), ...activities.map(a => ({ ...a, _type: 'activity' }))]
                  .filter((ev: any) => ev._type === 'comment' || (ev._type === 'activity' && ev.action !== 'created'))
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                
                const visibleEvents = showAllEvents ? timelineEvents : timelineEvents.slice(-5);
                const hiddenCount = timelineEvents.length - visibleEvents.length;

                return (
                  <>
                    {!loadingComments && hiddenCount > 0 && (
                      <div className="relative mb-5">
                        <span className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <MoreHorizontal size={8} className="text-slate-500" />
                        </span>
                        <button 
                          onClick={() => setShowAllEvents(true)}
                          className="text-[10px] text-slate-400 hover:text-[#6bd8cb] bg-slate-800/30 hover:bg-slate-800/60 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Show {hiddenCount} older updates
                        </button>
                      </div>
                    )}
                    
                    {visibleEvents.map((ev: any) => {
                      if (ev._type === 'comment') {
                        return (
                          <div key={`c-${ev.id}`} className="relative mb-4 group">
                            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#b4c5ff]/10 border border-[#b4c5ff]/30 flex items-center justify-center">
                              <MessageSquare size={8} className="text-[#b4c5ff]" />
                            </span>
                            <div className="bg-card2 rounded-xl px-3 py-2.5 border border-slate-800/30 group-hover:border-[#b4c5ff]/20 transition-colors">
                              <p className="text-xs text-text1/90 leading-relaxed break-words">{ev.content}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1.5">{fmtDate(ev.created_at)}</p>
                            </div>
                          </div>
                        );
                      } else {
                        let activityText = 'Updated task';
                        if (ev.new_value) {
                          const keys = Object.keys(ev.new_value);
                          if (keys.length > 0) {
                            const k = keys[0];
                            activityText = `Changed ${k.replace('_', ' ')} to ${ev.new_value[k] || 'none'}`;
                          }
                        }

                        return (
                          <div key={`a-${ev.id}`} className="relative mb-4">
                            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            </span>
                            <div className="text-xs mt-0.5">
                              <span className="text-slate-400 font-medium">{activityText}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">{fmtDate(ev.created_at)}</p>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </>
                );
              })()}

              {!loadingComments && comments.length === 0 && activities.length <= 1 && (
                <p className="text-[11px] text-slate-400 dark:text-slate-600 pl-1 italic">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

        <div className="p-6 bg-card2 border-t border-slate-200 dark:border-slate-800/30 flex-shrink-0">
        <form onSubmit={handleComment} className="relative">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-input border border-slate-200 dark:border-transparent rounded-xl py-3 pl-4 pr-12 text-sm text-text1 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30"
            placeholder="Type a comment..."
          />
          <button type="submit" disabled={submitting || !comment.trim()} className="absolute right-3 top-2.5 text-[#6bd8cb] disabled:opacity-40">
            <Send size={18} />
          </button>
        </form>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal
          taskTitle={task.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ taskTitle, onConfirm, onCancel, loading }: {
  taskTitle: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-[#ffb4ab]/20 p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#ffb4ab]/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-[#ffb4ab]" />
          </div>
          <div>
            <h2 className="font-bold text-text1 text-base">Xóa task này?</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">Hành động này không thể hoàn tác</p>
          </div>
        </div>
        <div className="bg-card2 rounded-xl px-4 py-3 mb-6 border border-slate-200 dark:border-slate-800/40">
          <p className="text-sm text-slate-300 font-medium truncate">{taskTitle}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-input text-slate-300 text-sm font-semibold hover:bg-input2 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20 text-sm font-semibold hover:bg-[#ffb4ab]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <span className="w-4 h-4 border-2 border-[#ffb4ab]/30 border-t-[#ffb4ab] rounded-full animate-spin" /> : <Trash2 size={14} />}
            Xóa
          </button>
        </div>
      </div>
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
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/30 p-8 w-full max-w-md shadow-2xl">
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

  const { data, loading, error, refetch } = useTasks(workspaceId);
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
      setStatusOverrides((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
      refetch();
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
        <DetailPanel task={activeTask} workspaceId={workspaceId}
          onClose={() => setActiveTask(null)}
          onUpdated={() => { refetch(); setActiveTask(null); }}
        />
      )}

      {createOpen && workspaceId && (
        <CreateTaskModal workspaceId={workspaceId} onCreated={refetch} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
