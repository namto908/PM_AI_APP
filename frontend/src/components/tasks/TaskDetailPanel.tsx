import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Share2, Trash2, X, Calendar, MoreHorizontal, MessageSquare, Send, RefreshCw, Edit2, Check, Lock } from 'lucide-react';
import { tasksApi, type Task, type TaskComment, type TaskActivity } from '@/api/tasks';
import { useAuthStore } from '@/stores/authStore';
import { adminApi, type WorkspaceInfo } from '@/api/admin';

const PRIORITY_TAG: Record<string, string> = {
  low:    'bg-surface-container-highest text-on-surface-variant font-black',
  medium: 'bg-secondary/10 text-secondary border border-secondary/20 font-black',
  high:   'bg-tertiary/10 text-tertiary border border-tertiary/20 font-black',
  urgent: 'bg-error/10 text-error border border-error/20 font-black',
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DeleteConfirmModal({ taskTitle, onConfirm, onCancel, loading }: {
  taskTitle: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-md">
      <div className="bg-surface rounded-2xl border border-error/20 p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-top-8 duration-500">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={24} className="text-error" />
          </div>
          <div>
            <h2 className="font-bold text-on-surface text-lg">Delete this task?</h2>
            <p className="text-sm text-on-surface-variant/70 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-xl px-5 py-4 mb-8 border border-outline-variant/30">
          <p className="text-sm text-on-surface font-black truncate">{taskTitle}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-sm font-black hover:bg-surface-container-highest/50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-error text-on-error-container text-sm font-black hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-error/20"
          >
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={16} />}
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
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState(task.description || '');
  const [savingDesc, setSavingDesc] = useState(false);
  
  const [userRoleInWs, setUserRoleInWs] = useState<string | null>(null);
  const user = useAuthStore(s => s.user);
  
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

  const fetchUserRole = async () => {
    try {
      const { data } = await adminApi.listWorkspaces();
      const ws = data.find((w: WorkspaceInfo) => w.id === workspaceId);
      if (ws) setUserRoleInWs(ws.role || null);
    } catch {}
  };

  useEffect(() => {
    setLoadingComments(true);
    setTempDesc(task.description || '');
    Promise.all([
      fetchComments(),
      fetchActivities(),
      fetchSubtasks(),
      fetchUserRole()
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

  const currentUserId = user?.id;
  const isCreator = task.created_by === currentUserId;
  const isSystemManager = user?.system_role === 'superadmin' || user?.system_role === 'manager';
  const isWsManager = userRoleInWs === 'owner' || userRoleInWs === 'manager';
  const canModify = isCreator || isSystemManager || isWsManager;

  const handleUpdateDescription = async () => {
    if (tempDesc === task.description) {
      setIsEditingDesc(false);
      return;
    }
    setSavingDesc(true);
    try {
      await tasksApi.update(workspaceId, task.id, { description: tempDesc });
      setIsEditingDesc(false);
      onUpdated();
      fetchActivities();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Failed to update description');
    } finally {
      setSavingDesc(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!canModify) return;
    try {
      await tasksApi.update(workspaceId, task.id, { status: newStatus as any });
      onUpdated();
      fetchActivities();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Failed to update status');
    }
  };

  const statusLabel: Record<string, string> = {
    todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done',
  };

  const completedSubtasksCount = subtasks.filter(st => st.status === 'done').length;
  const totalSubtasksCount = subtasks.length;
  const progressPercent = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  const renderTimelineEvent = (ev: any) => {
    if (ev._type === 'comment') {
      return (
        <div key={`c-${ev.id}`} className="relative mb-4 group">
          <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center shadow-sm">
            <MessageSquare size={8} className="text-secondary" />
          </span>
          <div className="bg-surface-container/50 rounded-xl px-4 py-3 border border-outline-variant/20 shadow-sm transition-all group-hover:border-secondary/30">
            <p className="text-xs text-on-surface leading-relaxed break-words">{ev.content}</p>
            <p className="text-[10px] text-on-surface-variant/60 mt-2 font-medium">{fmtDate(ev.created_at)}</p>
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
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[450px] bg-surface shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-50 border-l border-outline-variant flex flex-col animate-slide-in-right">
      <div className="p-6 border-b border-outline-variant/30 flex items-center justify-between flex-shrink-0 bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <CheckSquare size={20} className="text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Task Detail</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="text-on-surface-variant/60 hover:text-on-surface p-2 rounded-xl hover:bg-surface-container transition-all"><Share2 size={18} /></button>
          <button onClick={() => setShowDeleteConfirm(true)} className="text-on-surface-variant/60 hover:text-error p-2 rounded-xl hover:bg-error/10 transition-all"><Trash2 size={18} /></button>
          <button onClick={onClose} className="text-on-surface-variant/60 hover:text-on-surface p-2 rounded-xl ml-2 hover:bg-surface-container transition-all"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8" style={{ scrollbarWidth: 'none' }}>
        <div className="mb-8">
          <span className={`text-[10px] font-black px-3 py-1 rounded inline-block uppercase tracking-widest mb-4 shadow-sm ${PRIORITY_TAG[task.priority]}`}>
            {task.priority}
          </span>
          <h1 className="font-bold text-2xl text-on-surface leading-[1.2] mb-5 font-headline">{task.title}</h1>
          <div className="flex items-center gap-5 text-sm text-on-surface-variant/70">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black mr-1">Owner</div>
              {task.creator_avatar ? (
                <img src={task.creator_avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover shadow-sm ring-1 ring-outline-variant/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shadow-sm">
                  {task.creator_name ? task.creator_name.charAt(0).toUpperCase() : '—'}
                </div>
              )}
              <span className="font-bold text-on-surface">{task.creator_name || 'Unknown'}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/30" />
            <div 
              className="flex items-center gap-2 relative group cursor-pointer p-2 -m-2 rounded-xl hover:bg-surface-container transition-all"
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
              <Calendar size={16} className="text-secondary" />
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
              <span className="group-hover:text-on-surface transition-colors font-bold text-secondary">
                {task.due_date ? `Due ${fmtDate(task.due_date)}` : 'Set due date'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container/30 p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3 flex justify-between items-center">
              Status
              {!canModify && <Lock size={10} className="text-on-surface-variant/30" />}
            </h5>
            {canModify ? (
              <select
                value={task.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0 cursor-pointer w-full"
              >
                {Object.entries(statusLabel).map(([val, label]) => (
                  <option key={val} value={val} className="bg-surface-container text-sm">{label}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-on-surface font-bold">{statusLabel[task.status] ?? task.status}</p>
            )}
          </div>

          <div className="bg-surface-container/30 p-5 rounded-2xl border border-outline-variant/30 shadow-sm relative group/desc">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3 flex justify-between items-center">
              Description
              {canModify && !isEditingDesc && (
                <button 
                  onClick={() => setIsEditingDesc(true)}
                  className="opacity-0 group-hover/desc:opacity-100 transition-opacity p-1 hover:bg-surface-container rounded"
                >
                  <Edit2 size={12} />
                </button>
              )}
              {!canModify && <Lock size={10} className="text-on-surface-variant/30" />}
            </h5>
            
            {isEditingDesc ? (
              <div className="space-y-3">
                <textarea
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  autoFocus
                  className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[120px] resize-none"
                  placeholder="Task background, scope, or key details..."
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => { setIsEditingDesc(false); setTempDesc(task.description || ''); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateDescription}
                    disabled={savingDesc}
                    className="px-4 py-1.5 bg-primary text-on-primary-fixed rounded-lg text-xs font-black shadow-lg shadow-primary/10 hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    {savingDesc ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                    Save Change
                  </button>
                </div>
              </div>
            ) : (
              <p 
                className={`text-sm text-on-surface leading-loose text-pretty ${canModify ? 'cursor-pointer' : ''}`}
                onClick={() => canModify && setIsEditingDesc(true)}
              >
                {task.description || <span className="text-on-surface-variant/30 italic">No description provided</span>}
              </p>
            )}
          </div>

          {/* Subtasks Section */}
          <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
            <div className="flex justify-between items-end mb-5">
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Subtasks</h5>
                <p className="text-xs text-on-surface-variant/70">{completedSubtasksCount} of {totalSubtasksCount} objectives completed</p>
              </div>
              <div className="text-right">
                <span className="text-primary font-black text-2xl font-headline">{progressPercent}%</span>
              </div>
            </div>
            
            <div className="w-full bg-surface-container-highest h-2 rounded-full mb-8 overflow-hidden shadow-inner">
              <div className="bg-primary h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(107,216,203,0.5)]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            <div className="space-y-3.5 relative">
              {subtasks.map(st => {
                const isDone = st.status === 'done';
                return (
                  <div key={st.id} className={`flex items-center gap-4 p-3.5 bg-surface-container/40 hover:bg-surface-container/70 border border-outline-variant/40 transition-all rounded-xl group overflow-hidden shadow-sm hover:shadow-md ${canModify ? 'cursor-pointer' : ''}`} onClick={() => canModify && toggleSubtaskStatus(st)}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isDone ? 'bg-primary text-on-primary-fixed shadow-md shadow-primary/20' : 'border-2 border-outline-variant/60 text-transparent' + (canModify ? ' group-hover:border-primary group-hover:text-primary/40' : '')}`}>
                      {isDone ? <CheckSquare size={14} strokeWidth={3} /> : <CheckSquare size={14} />}
                    </div>
                    <span className={`flex-1 text-sm transition-colors ${isDone ? 'text-on-surface-variant/50 line-through' : 'text-on-surface font-bold'}`}>
                      {st.title}
                    </span>
                    {canModify && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteSubtask(st.id); }}
                        className="text-on-surface-variant/40 hover:text-error opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-error/10 rounded-lg flex-shrink-0"
                        title="Delete Subtask"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}

              
              {canModify && (
                <form onSubmit={handleCreateSubtask} className="flex items-center gap-4 p-3.5 bg-surface-container/20 rounded-xl border-l-[3px] border-primary ring-1 ring-primary/10 focus-within:ring-primary/50 transition-all shadow-inner">
                  <div className="w-6 h-6 rounded-lg border-2 border-outline-variant/30 flex items-center justify-center"></div>
                  <input 
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-bold p-0 text-sm placeholder:text-on-surface-variant/30" 
                    placeholder="New subtask objective..." 
                  />
                  <button 
                    type="submit"
                    disabled={!newSubtaskTitle.trim() || addingSubtask}
                    className="px-4 py-2 bg-primary text-on-primary-fixed rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="bg-surface-container/30 p-5 rounded-2xl border border-outline-variant/30 shadow-sm space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3">System Metadata</h5>
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>Creator</span>
              <div className="flex items-center gap-2">
                {task.creator_avatar && <img src={task.creator_avatar} alt="" className="w-4 h-4 rounded-full" />}
                <span className="font-bold text-on-surface">{task.creator_name || 'System'}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant"><span>Created</span><span className="font-mono text-[10px]">{fmtDate(task.created_at)}</span></div>
            <div className="flex justify-between text-xs text-on-surface-variant"><span>Last Updated</span><span className="font-mono text-[10px]">{fmtDate(task.updated_at)}</span></div>
            {task.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-lg font-black uppercase tracking-wider border border-primary/20">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-5 px-1">Activity Feed</h5>
            <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/30">
              {loadingComments && (
                <p className="text-[11px] text-on-surface-variant/40 pl-1 italic">Refreshing timeline...</p>
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
                      <div className="relative mb-6 mt-3">
                        <span className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center shadow-sm">
                          <MoreHorizontal size={8} className="text-on-surface-variant/50" />
                        </span>
                        <button 
                          onClick={() => setShowAllEvents(!showAllEvents)}
                          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-on-primary-fixed bg-primary/10 hover:bg-primary px-4 py-2 rounded-xl transition-all shadow-sm"
                        >
                          {showAllEvents ? 'Show fewer events' : `See ${hiddenCount} more updates`}
                        </button>
                      </div>
                    )}

                      <div className="relative mt-10">
                        <span className="absolute -left-6 top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-[0_0_10px_rgba(107,216,203,0.4)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </span>
                        <div className="text-xs">
                          <span className="font-black text-on-surface uppercase tracking-wider text-[10px]">Project originated</span>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {task.creator_avatar && <img src={task.creator_avatar} alt="" className="w-3.5 h-3.5 rounded-full" />}
                            <span className="text-[10px] text-on-surface font-black">{task.creator_name || 'System'}</span>
                            <span className="text-[10px] text-on-surface-variant/40 font-mono">- {fmtDate(task.created_at)}</span>
                          </div>
                        </div>
                      </div>
                  </>
                );
              })()}

              {!loadingComments && comments.length === 0 && activities.length <= 1 && (
                <p className="text-[11px] text-on-surface-variant/30 pl-1 italic font-medium">No activity history recorded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-surface-container/50 backdrop-blur-md border-t border-outline-variant/30 flex-shrink-0">
        <form onSubmit={handleComment} className="relative group">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/50 rounded-2xl py-4 pl-5 pr-14 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner group-focus-within:shadow-lg"
            placeholder="Write a message to the team..."
          />
          <button type="submit" disabled={submitting || !comment.trim()} className="absolute right-3 top-2.5 p-2 text-primary bg-primary/10 rounded-xl hover:bg-primary/20 disabled:opacity-40 transition-all shadow-sm">
            <Send size={20} />
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
