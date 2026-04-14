import React, { useState, useEffect } from 'react';
import { CheckSquare, Trash2, Calendar, MessageSquare, Send } from 'lucide-react';
import { tasksApi, type Task, type TaskComment, type TaskActivity } from '@/api/tasks';


function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function InlineTaskDetail({ task, workspaceId }: {
  task: Task; workspaceId: string;
}) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

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
      fetchActivities();
    } finally {
      setAddingSubtask(false);
    }
  };
  
  const toggleSubtaskStatus = async (subtask: Task) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    setSubtasks(prev => prev.map(st => st.id === subtask.id ? { ...st, status: newStatus } : st));
    try {
      await tasksApi.update(workspaceId, subtask.id, { status: newStatus });
    } catch {
      setSubtasks(prev => prev.map(st => st.id === subtask.id ? { ...st, status: subtask.status } : st));
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
    try {
      await tasksApi.delete(workspaceId, subtaskId);
    } catch {
      fetchSubtasks();
    }
  };

  const completedSubtasksCount = subtasks.filter(st => st.status === 'done').length;
  const totalSubtasksCount = subtasks.length;
  const progressPercent = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  const timelineEvents = [...comments.map(c => ({ ...c, _type: 'comment' })), ...activities.map(a => ({ ...a, _type: 'activity' }))]
    .filter((ev: any) => ev._type === 'comment' || (ev._type === 'activity' && ev.action !== 'created'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-6 bg-surface-container/50 rounded-2xl mt-2 border border-outline-variant shadow-sm relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Primary Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface p-4 rounded-xl border border-outline-variant flex flex-col justify-center shadow-sm">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Owner</div>
              <div className="flex items-center gap-2">
                {task.creator_avatar ? (
                  <img src={task.creator_avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {task.creator_name ? task.creator_name.charAt(0).toUpperCase() : '—'}
                  </div>
                )}
                <span className="text-sm font-medium text-on-surface">{task.creator_name || 'Unknown'}</span>
              </div>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-outline-variant flex flex-col justify-center shadow-sm">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Due Date</div>
              <div className="flex items-center gap-2 text-secondary">
                <Calendar size={14} />
                <span className="text-sm font-medium">{task.due_date ? fmtDate(task.due_date) : 'No due date'}</span>
              </div>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-outline-variant flex flex-col justify-center shadow-sm">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black mb-1">Status</div>
              <div className="flex items-center gap-2 text-on-surface">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-sm font-medium capitalize">{task.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant/50 mb-4">Task Description</h3>
            <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
              {task.description || "No description provided."}
            </p>
          </div>

          {/* Subtasks Section */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant/50 mb-1">Subtasks</h3>
                <p className="text-xs text-on-surface-variant">{completedSubtasksCount} of {totalSubtasksCount} objectives completed</p>
              </div>
              <span className="text-primary font-black text-xl">{progressPercent}%</span>
            </div>
            
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mb-6 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(107,216,203,0.4)]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            <div className="space-y-3">
              {subtasks.map(st => {
                const isDone = st.status === 'done';
                return (
                  <div key={st.id} className="flex items-center gap-3 p-3 bg-surface-container/40 hover:bg-surface-container/70 border border-outline-variant/50 transition-all rounded-xl group cursor-pointer" onClick={() => toggleSubtaskStatus(st)}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isDone ? 'bg-primary text-on-primary-fixed' : 'border-2 border-outline-variant group-hover:border-primary text-transparent group-hover:text-primary/30'}`}>
                      {isDone ? <CheckSquare size={12} strokeWidth={3} /> : <CheckSquare size={12} />}
                    </div>
                    <span className={`flex-1 text-sm ${isDone ? 'text-on-surface-variant/60 line-through font-normal' : 'text-on-surface font-medium'}`}>
                      {st.title}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }}
                      className="text-on-surface-variant/40 hover:text-error opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              
              <form onSubmit={handleCreateSubtask} className="flex items-center gap-3 p-3 bg-surface-container/20 rounded-xl border border-outline-variant/30 ring-1 ring-primary/10 focus-within:ring-primary/50 transition-all">
                <div className="w-5 h-5 rounded border-2 border-outline-variant/50 flex items-center justify-center"></div>
                <input 
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-medium p-0 text-sm placeholder:text-on-surface-variant/30" 
                  placeholder="Enter subtask title..." 
                />
                <button 
                  type="submit"
                  disabled={!newSubtaskTitle.trim() || addingSubtask}
                  className="px-4 py-1.5 bg-primary text-on-primary-fixed rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Secondary Column (Activity Feed) */}
        <div className="bg-surface rounded-xl flex flex-col h-[600px] border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant/30 bg-surface-container/30">
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-on-surface-variant/50">Activity & Comments</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/30">
              {loadingComments && <p className="text-[11px] text-on-surface-variant/60 pl-1 italic">Loading feed...</p>}

              {timelineEvents.map((ev: any) => {
                if (ev._type === 'comment') {
                  return (
                    <div key={`c-${ev.id}`} className="relative mb-4 group">
                      <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center shadow-sm">
                        <MessageSquare size={8} className="text-secondary" />
                      </span>
                      <div className="bg-surface-container/50 rounded-xl px-4 py-3 border border-outline-variant/20 shadow-sm">
                        <p className="text-xs text-on-surface leading-relaxed break-words">{ev.content}</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-2 font-medium">{fmtDate(ev.created_at)}</p>
                      </div>
                    </div>
                  );
                } else {
                  let activityText = 'Updated task';
                  if (ev.action === 'subtask_added') {
                    activityText = `Added subtask: ${ev.new_value?.title || 'Unknown'}`;
                  } else if (ev.new_value) {
                    const keys = Object.keys(ev.new_value);
                    if (keys.length > 0) {
                      const k = keys[0];
                      activityText = `Changed ${k.replace('_', ' ')} to ${ev.new_value[k] || 'none'}`;
                    }
                  }

                  return (
                    <div key={`a-${ev.id}`} className="relative mb-4">
                      <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40" />
                      </span>
                      <div className="text-xs mt-0.5">
                        <span className="text-on-surface-variant font-medium">{activityText}</span>
                        <p className="text-[10px] text-on-surface-variant/40 mt-1 font-mono">{fmtDate(ev.created_at)}</p>
                      </div>
                    </div>
                  );
                }
              })}

              <div className="relative mt-8">
                <span className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-[0_0_8px_rgba(107,216,203,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </span>
                <div className="text-xs">
                  <span className="font-black text-on-surface uppercase tracking-wider text-[10px]">Task created</span>
                  <p className="text-[10px] text-on-surface-variant/50 mt-1">{fmtDate(task.created_at)}</p>
                </div>
              </div>

              {!loadingComments && timelineEvents.length === 0 && (
                <p className="text-[11px] text-on-surface-variant/40 pl-1 italic">No recent activity</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-surface-container/30 border-t border-outline-variant/30">
            <form onSubmit={handleComment} className="relative">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/50 rounded-xl py-3 pl-4 pr-12 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-inner"
                placeholder="Write a comment..."
              />
              <button type="submit" disabled={submitting || !comment.trim()} className="absolute right-2 top-2 p-1.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-40 transition-all shadow-sm">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
