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
    <div className="p-6 bg-card2/50 rounded-xl mt-2 border border-slate-800/40 shadow-sm relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Primary Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-xl border border-slate-800/40 flex flex-col justify-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Assignee</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#6bd8cb]/20 flex items-center justify-center text-[10px] font-bold text-[#6bd8cb]">
                  {task.assignee_id ? 'A' : '—'}
                </div>
                <span className="text-sm font-medium text-text1">{task.assignee_id ? 'Assigned' : 'Unassigned'}</span>
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-slate-800/40 flex flex-col justify-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Due Date</div>
              <div className="flex items-center gap-2 text-[#b4c5ff]">
                <Calendar size={14} />
                <span className="text-sm font-medium">{task.due_date ? fmtDate(task.due_date) : 'No due date'}</span>
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border border-slate-800/40 flex flex-col justify-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Status</div>
              <div className="flex items-center gap-2 text-text1">
                <div className="w-2 h-2 rounded-full bg-[#6bd8cb] animate-pulse"></div>
                <span className="text-sm font-medium capitalize">{task.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card p-6 rounded-xl border border-slate-800/40">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Task Description</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {task.description || "No description provided."}
            </p>
          </div>

          {/* Subtasks Section */}
          <div className="bg-card p-6 rounded-xl border border-slate-800/40">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">Subtasks</h3>
                <p className="text-xs text-slate-500">{completedSubtasksCount} of {totalSubtasksCount} objectives completed</p>
              </div>
              <span className="text-[#6bd8cb] font-bold text-xl">{progressPercent}%</span>
            </div>
            
            <div className="w-full bg-slate-800/50 h-1.5 rounded-full mb-6 overflow-hidden">
              <div className="bg-[#6bd8cb] h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            <div className="space-y-3">
              {subtasks.map(st => {
                const isDone = st.status === 'done';
                return (
                  <div key={st.id} className="flex items-center gap-3 p-3 bg-card2 hover:bg-card2/80 border border-slate-800/40 transition-colors rounded-xl group cursor-pointer" onClick={() => toggleSubtaskStatus(st)}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isDone ? 'bg-[#6bd8cb] text-[#003732]' : 'border-2 border-slate-600 group-hover:border-[#6bd8cb] text-transparent group-hover:text-[#6bd8cb]/30'}`}>
                      {isDone ? <CheckSquare size={12} strokeWidth={3} /> : <CheckSquare size={12} />}
                    </div>
                    <span className={`flex-1 text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-300 font-medium'}`}>
                      {st.title}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }}
                      className="text-slate-500 hover:text-[#ffb4ab] opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              
              <form onSubmit={handleCreateSubtask} className="flex items-center gap-3 p-3 bg-card2/50 rounded-xl border border-slate-800/40 ring-1 ring-[#6bd8cb]/10 focus-within:ring-[#6bd8cb]/50 transition-all">
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
                  className="px-3 py-1 bg-[#6bd8cb] text-[#003732] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Secondary Column (Activity Feed) */}
        <div className="bg-card rounded-xl flex flex-col h-[600px] border border-slate-800/40">
          <div className="p-4 border-b border-slate-800/40">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Activity & Comments</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
              {loadingComments && <p className="text-[11px] text-slate-500 pl-1">Loading...</p>}

              {timelineEvents.map((ev: any) => {
                if (ev._type === 'comment') {
                  return (
                    <div key={`c-${ev.id}`} className="relative mb-4 group">
                      <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#b4c5ff]/10 border border-[#b4c5ff]/30 flex items-center justify-center">
                        <MessageSquare size={8} className="text-[#b4c5ff]" />
                      </span>
                      <div className="bg-card2 rounded-xl px-3 py-3 border border-slate-800/30">
                        <p className="text-xs text-slate-300 leading-relaxed break-words">{ev.content}</p>
                        <p className="text-[10px] text-slate-500 mt-2">{fmtDate(ev.created_at)}</p>
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
                      <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      </span>
                      <div className="text-xs mt-0.5">
                        <span className="text-slate-400 font-medium">{activityText}</span>
                        <p className="text-[10px] text-slate-500 mt-1">{fmtDate(ev.created_at)}</p>
                      </div>
                    </div>
                  );
                }
              })}

              <div className="relative mt-8">
                <span className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-[#6bd8cb]/20 border-2 border-[#6bd8cb] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6bd8cb]" />
                </span>
                <div className="text-xs">
                  <span className="font-bold text-text1">Task created</span>
                  <p className="text-[10px] text-slate-400 mt-1">{fmtDate(task.created_at)}</p>
                </div>
              </div>

              {!loadingComments && timelineEvents.length === 0 && (
                <p className="text-[11px] text-slate-500 pl-1 italic">No recent activity</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-card2/30 border-t border-slate-800/40">
            <form onSubmit={handleComment} className="relative">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-input border border-slate-800/40 rounded-xl py-3 pl-4 pr-12 text-xs text-text1 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6bd8cb]/50"
                placeholder="Write a comment..."
              />
              <button type="submit" disabled={submitting || !comment.trim()} className="absolute right-2 top-2 p-1.5 text-[#6bd8cb] bg-[#6bd8cb]/10 rounded-lg hover:bg-[#6bd8cb]/20 disabled:opacity-40 transition-colors">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
