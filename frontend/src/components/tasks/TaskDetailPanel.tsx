import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Share2, Trash2, X, Calendar, MoreHorizontal, MessageSquare, Send } from 'lucide-react';
import { tasksApi, type Task, type TaskComment, type TaskActivity } from '@/api/tasks';

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

function DeleteConfirmModal({ taskTitle, onConfirm, onCancel, loading }: {
  taskTitle: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-[#ffb4ab]/20 p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-top-8 duration-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#ffb4ab]/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-[#ffb4ab]" />
          </div>
          <div>
            <h2 className="font-bold text-text1 text-base">Delete this task?</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">This action cannot be undone</p>
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
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20 text-sm font-semibold hover:bg-[#ffb4ab]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <span className="w-4 h-4 border-2 border-[#ffb4ab]/30 border-t-[#ffb4ab] rounded-full animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskDetailPanel({ task, workspaceId, onClose, onUpdated }: {
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
  
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchSubtasks = async () => {
    try {
      const res = await tasksApi.list(workspaceId, { parent_id: task.id, page_size: 100 });
      setSubtasks(res.data.items);
    } catch {}
  };

  const fetchActivities = async () => {
    try {
      const res = await tasksApi.getActivities(workspaceId, task.id);
      setActivities(res.data);
    } catch {}
  };

  const fetchComments = async () => {
    try {
      const res = await tasksApi.getComments(workspaceId, task.id);
      setComments(res.data);
    } catch {}
  };

  useEffect(() => {
    setLoadingComments(true);
    Promise.all([
      fetchComments(),
      fetchActivities(),
      fetchSubtasks()
    ]).finally(() => setLoadingComments(false));
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

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || addingSubtask) return;
    setAddingSubtask(true);
    try {
      const res = await tasksApi.create(workspaceId, {
        title: newSubtaskTitle,
        parent_id: task.id,
        priority: 'medium',
      });
      setSubtasks(prev => [...prev, res.data]);
      setNewSubtaskTitle('');
      fetchActivities(); // Refresh timeline to show subtask_added activity
    } finally {
      setAddingSubtask(false);
    }
  };
  
  const toggleSubtaskStatus = async (subtask: Task) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    // Optimistic update
    setSubtasks(prev => prev.map(st => st.id === subtask.id ? { ...st, status: newStatus } : st));
    try {
      await tasksApi.update(workspaceId, subtask.id, { status: newStatus });
    } catch {
      // Revert on failure
      setSubtasks(prev => prev.map(st => st.id === subtask.id ? { ...st, status: subtask.status } : st));
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
    try {
      await tasksApi.delete(workspaceId, subtaskId);
    } catch {
      fetchSubtasks(); // Re-fetch on error to reset
    }
  };

  const statusLabel: Record<string, string> = {
    todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
  };

  const completedSubtasksCount = subtasks.filter(st => st.status === 'done').length;
  const totalSubtasksCount = subtasks.length;
  const progressPercent = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  const renderTimelineEvent = (ev: any) => {
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
      if (ev.action === 'subtask_added') {
        const subtaskTitle = ev.new_value?.title || 'Unknown Subtask';
        activityText = `Added subtask: ${subtaskTitle}`;
      } else if (ev.new_value) {
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
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[450px] bg-white dark:bg-[#131b2e] shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-50 border-l border-slate-200 dark:border-slate-800/20 flex flex-col animate-slide-in-right">
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

          {/* Subtasks Section */}
          <div className="bg-card2 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800/20">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500 mb-1">Subtasks</h5>
                <p className="text-xs text-slate-500">{completedSubtasksCount} of {totalSubtasksCount} objectives completed</p>
              </div>
              <div className="text-right">
                <span className="text-[#6bd8cb] font-bold text-xl font-headline">{progressPercent}%</span>
              </div>
            </div>
            
            <div className="w-full bg-slate-800/50 h-1.5 rounded-full mb-6 overflow-hidden">
              <div className="bg-[#6bd8cb] h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            <div className="space-y-3 relative">
              {subtasks.map(st => {
                const isDone = st.status === 'done';
                return (
                  <div key={st.id} className="flex items-center gap-3 p-3 bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800/40 transition-colors rounded-xl group cursor-pointer" onClick={() => toggleSubtaskStatus(st)}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isDone ? 'bg-[#6bd8cb] text-[#003732]' : 'border-2 border-slate-600 group-hover:border-[#6bd8cb] text-transparent group-hover:text-[#6bd8cb]/30'}`}>
                      {isDone ? <CheckSquare size={12} strokeWidth={3} /> : <CheckSquare size={12} />}
                    </div>
                    <span className={`flex-1 text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-300 font-medium'}`}>
                      {st.title}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }}
                      className="text-slate-500 hover:text-[#ffb4ab] opacity-0 group-hover:opacity-100 transition-all p-1"
                      title="Delete Subtask"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              
              <form onSubmit={handleCreateSubtask} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border-l-2 border-[#6bd8cb] ring-1 ring-[#6bd8cb]/20 focus-within:ring-[#6bd8cb]/50 transition-all">
                <div className="w-5 h-5 rounded border-2 border-slate-600/50 flex items-center justify-center"></div>
                <input 
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-300 font-medium p-0 text-sm placeholder:text-slate-600" 
                  placeholder="Enter subtask title..." 
                />
                <button 
                  type="submit"
                  disabled={!newSubtaskTitle.trim() || addingSubtask}
                  className="px-2.5 py-1 bg-[#6bd8cb] text-[#003732] rounded-lg text-[9px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

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
              {loadingComments && (
                <p className="text-[11px] text-slate-400 dark:text-slate-600 pl-1">Loading timeline...</p>
              )}

              {(() => {
                const timelineEvents = [...comments.map(c => ({ ...c, _type: 'comment' })), ...activities.map(a => ({ ...a, _type: 'activity' }))]
                  .filter((ev: any) => ev._type === 'comment' || (ev._type === 'activity' && ev.action !== 'created'))
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                const visibleEvents = timelineEvents.slice(0, 5);
                const hiddenEvents = timelineEvents.slice(5);
                const hiddenCount = hiddenEvents.length;

                return (
                  <>
                    
                    {visibleEvents.map((ev: any) => renderTimelineEvent(ev))}

                    <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
                      showAllEvents ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}>
                      <div className="overflow-hidden">
                        {hiddenEvents.map((evValue: any) => renderTimelineEvent(evValue))}
                      </div>
                    </div>

                    {!loadingComments && hiddenCount > 0 && (
                      <div className="relative mb-5 mt-2">
                        <span className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <MoreHorizontal size={8} className="text-slate-500" />
                        </span>
                        <button 
                          onClick={() => setShowAllEvents(!showAllEvents)}
                          className="text-[10px] text-slate-400 hover:text-[#6bd8cb] bg-slate-800/30 hover:bg-slate-800/60 px-3 py-1.5 rounded-md transition-colors"
                        >
                          {showAllEvents ? 'Show less' : `Show ${hiddenCount} older updates`}
                        </button>
                      </div>
                    )}

                    <div className="relative mt-8">
                      <span className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-[#6bd8cb]/20 border-2 border-[#6bd8cb] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb]" />
                      </span>
                      <div className="text-xs">
                        <span className="font-bold text-text1">Task created</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">{fmtDate(task.created_at)}</p>
                      </div>
                    </div>
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
          <button type="submit" disabled={submitting || !comment.trim()} className="absolute right-3 top-2.5 text-[#6bd8cb] disabled:opacity-40 hover:opacity-80 transition-opacity">
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
