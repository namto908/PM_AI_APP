import { useEffect, useState, useMemo } from 'react';
import { 
  Building2, Users, Plus, LayoutGrid, 
  Trash2, UserPlus, Shield, CheckCircle2,
  AlertCircle, ExternalLink, RefreshCw, Settings2
} from 'lucide-react';
import { adminApi, type AdminUser, type WorkspaceInfo, type WorkspaceMember } from '@/api/admin';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_ORDER = ['guest', 'employee', 'manager', 'owner'];

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  owner:    { label: 'Owner',    color: 'text-amber-400', bg: 'bg-amber-400/10 border border-amber-400/20' },
  manager:  { label: 'Manager',  color: 'text-teal-400',  bg: 'bg-teal-400/10 border border-teal-400/20' },
  employee: { label: 'Employee', color: 'text-sky-400',   bg: 'bg-sky-400/10 border border-sky-400/20' },
  guest:    { label: 'Guest',    color: 'text-slate-400', bg: 'bg-slate-400/10 border border-slate-400/20' },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_BADGES[role];
  if (!cfg) return <span className="text-[10px] text-slate-500">{role}</span>;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const user = useAuthStore(s => s.user);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  
  const [activeTab, setActiveTab] = useState<'list' | 'members' | 'settings'>('list');
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [loading, setLoading]     = useState(true);
  
  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newWs, setNewWs] = useState({ name: '', slug: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createErr, setCreateErr] = useState('');

  // Members state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);
  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('employee');

  // ── Fetch Workspaces ──
  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listWorkspaces();
      setWorkspaces(data);
    } catch { /* err */ } finally { setLoading(false); }
  };

  // ── Fetch Members for Active Workspace ──
  const fetchMembers = async () => {
    if (!activeWorkspaceId) return;
    setMembersLoading(true);
    try {
      const { data } = await adminApi.listMembers(activeWorkspaceId);
      setMembers(data);
      
      // Also fetch users to enrich names (Superadmin can see all, Manager sees team)
      const usersRes = user?.system_role === 'superadmin' 
        ? await adminApi.listUsers() 
        : await adminApi.listTeamUsers();
      setAllUsers(usersRes.data);
    } catch { /* err */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkspaces(); }, []);
  useEffect(() => { if (activeTab === 'members') fetchMembers(); }, [activeTab, activeWorkspaceId]);

  // ── Handlers ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true); setCreateErr('');
    try {
      const { data } = await adminApi.createWorkspace(newWs);
      setWorkspaces(prev => [...prev, data]);
      setIsCreating(false);
      setNewWs({ name: '', slug: '' });
      setActiveWorkspace(data.id);
    } catch (err: any) {
      setCreateErr(err.response?.data?.detail ?? 'Failed to create workspace');
    } finally { setCreateLoading(false); }
  };

  const handleAddMember = async () => {
    if (!activeWorkspaceId || !addMemberId) return;
    setMembersLoading(true);
    try {
      await adminApi.addMember(activeWorkspaceId, addMemberId, addMemberRole);
      setAddMemberId('');
      await fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Failed to add member');
    } finally { setMembersLoading(false); }
  };

  const handleUpdateRole = async (uid: string, role: string) => {
    if (!activeWorkspaceId) return;
    setMemberActionLoading(uid);
    try {
      await adminApi.updateMemberRole(activeWorkspaceId, uid, role);
      setMembers(prev => prev.map(m => m.user_id === uid ? { ...m, role } : m));
    } catch { /* err */ } finally { setMemberActionLoading(null); }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!activeWorkspaceId || !confirm('Remove this member?')) return;
    setMemberActionLoading(uid);
    try {
      await adminApi.removeMember(activeWorkspaceId, uid);
      setMembers(prev => prev.filter(m => m.user_id !== uid));
    } catch { /* err */ } finally { setMemberActionLoading(null); }
  };

  // Enrich members with user names/emails
  const enrichedMembers = useMemo(() => {
    return members.map(m => {
      const u = allUsers.find(au => au.id === m.user_id);
      return { ...m, name: u?.name ?? 'Unknown', email: u?.email ?? '---' };
    });
  }, [members, allUsers]);

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const isOwner = activeWs?.role === 'owner' || user?.system_role === 'superadmin';

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId) return;
    if (!confirm(`Are you sure you want to delete "${activeWs?.name}"? This action is permanent.`)) return;
    
    setLoading(true);
    try {
      await adminApi.deleteWorkspace(activeWorkspaceId);
      setWorkspaces(prev => prev.filter(w => w.id !== activeWorkspaceId));
      setActiveWorkspace(null);
      setActiveTab('list');
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Failed to delete workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background text-on-surface p-8 space-y-8">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline flex items-center gap-3">
            <Building2 className="text-primary" /> Workspace Management
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">Manage infrastructure, boundaries, and stakeholders</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-primary text-on-primary-fixed font-bold py-2 px-4 rounded-xl flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/10"
        >
          <Plus size={18} /> New Workspace
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl w-fit border border-outline-variant/10">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <LayoutGrid size={16} /> My Workspaces
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'members' ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <Users size={16} /> Team Members
        </button>
        {activeWorkspaceId && isOwner && (
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-surface-container-highest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Settings2 size={16} /> Settings
          </button>
        )}
      </div>

      <div className="space-y-6">
        
        {/* ── TAB 1: WORKSPACE LIST ─────────────────────────────────────── */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />)
            ) : workspaces.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <AlertCircle className="mx-auto text-on-surface-variant mb-3 opacity-20" size={40} />
                <p className="text-on-surface-variant font-medium">No workspaces found. Create one to get started.</p>
              </div>
            ) : (
              workspaces.map(ws => (
                <div 
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws.id)}
                  className={`group relative p-6 rounded-2xl border transition-all cursor-pointer ${
                    ws.id === activeWorkspaceId 
                    ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5' 
                    : 'bg-surface-container-low border-outline-variant/10 hover:border-primary/40 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Building2 size={24} />
                    </div>
                    <RoleBadge role={ws.role} />
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-1">{ws.name}</h3>
                  <p className="text-xs text-on-surface-variant font-mono">/{ws.slug}</p>
                  
                  {ws.id === activeWorkspaceId && (
                    <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-primary">
                      <CheckCircle2 size={12} /> Active Workspace
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={14} className="text-slate-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 2: MEMBERS ───────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {!activeWorkspaceId ? (
              <div className="bg-surface-container-low p-10 rounded-2xl text-center border border-dashed border-outline-variant/30 text-slate-500">
                Please select a workspace first.
              </div>
            ) : (
              <>
                {/* Active workspace info bar */}
                <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-on-surface">{activeWs?.name}</h2>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest leading-none mt-1">Internal Directory</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <select 
                        value={addMemberId}
                        onChange={e => setAddMemberId(e.target.value)}
                        className="bg-surface-container-highest border border-outline-variant/10 text-xs font-semibold py-2 px-3 rounded-lg text-on-surface focus:ring-primary w-48"
                       >
                         <option value="">Select User to Invite...</option>
                         {allUsers
                            .filter(u => !members.some(m => m.user_id === u.id))
                            .map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))
                         }
                       </select>
                       <select 
                        value={addMemberRole}
                        onChange={e => setAddMemberRole(e.target.value)}
                        className="bg-surface-container-highest border border-outline-variant/10 text-xs font-semibold py-2 px-3 rounded-lg text-on-surface focus:ring-primary"
                       >
                         <option value="manager">Manager</option>
                         <option value="employee">Employee</option>
                         <option value="guest">Guest</option>
                       </select>
                       <button 
                        onClick={handleAddMember}
                        disabled={!addMemberId || membersLoading}
                        className="bg-primary hover:brightness-110 disabled:opacity-50 text-on-primary-fixed p-2 rounded-lg transition-all"
                       >
                         <UserPlus size={18} />
                       </button>
                    </div>
                    <button 
                      onClick={fetchMembers}
                      className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-highest rounded-lg"
                    >
                      <RefreshCw size={18} className={membersLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* Member Table */}
                <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/10">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container/50 border-b border-outline-variant/10">
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Team Member</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Workspace Role</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Joined On</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {membersLoading && enrichedMembers.length === 0 ? (
                        Array(3).fill(0).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-8 w-40 bg-surface-container rounded" /></td>
                            <td className="px-6 py-4"><div className="h-5 w-20 bg-surface-container rounded" /></td>
                            <td className="px-6 py-4"><div className="h-5 w-24 bg-surface-container rounded" /></td>
                            <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-surface-container rounded ml-auto" /></td>
                          </tr>
                        ))
                      ) : (
                        enrichedMembers.map(m => (
                          <tr key={m.user_id} className="hover:bg-surface-container/30 transition-colors group">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-bold text-on-surface">{m.name}</p>
                                <p className="text-[10px] text-on-surface-variant font-mono truncate max-w-[200px]">{m.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                value={m.role}
                                disabled={m.role === 'owner' || memberActionLoading === m.user_id}
                                onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                                className="bg-transparent border-none p-0 text-sm font-semibold text-primary focus:ring-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {ROLE_ORDER.map(r => (
                                  <option key={r} value={r} className="bg-surface-container-highest uppercase text-[10px]">{r.toUpperCase()}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-xs text-on-surface-variant">
                              {new Date(m.joined_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {m.role !== 'owner' && (
                                <button 
                                  onClick={() => handleRemoveMember(m.user_id)}
                                  disabled={memberActionLoading === m.user_id}
                                  className="text-on-surface-variant hover:text-red-400 transition-colors p-2 disabled:opacity-30"
                                >
                                  {memberActionLoading === m.user_id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 3: SETTINGS ───────────────────────────────────────────── */}
        {activeTab === 'settings' && activeWorkspaceId && isOwner && (
          <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Settings2 size={120} />
              </div>
              <h2 className="text-xl font-bold mb-2">Workspace Configuration</h2>
              <p className="text-sm text-on-surface-variant mb-8">Adjust settings and manage the lifecycle of this workspace.</p>
              
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-red-400/5 border border-red-400/10">
                  <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                    <Trash2 size={18} /> Danger Zone
                  </h3>
                  <p className="text-xs text-on-surface-variant mb-4">
                    Once deleted, all data including tasks, members, and configuration will be permanently removed.
                    This action cannot be undone.
                  </p>
                  <button 
                    onClick={handleDeleteWorkspace}
                    className="bg-red-400/10 hover:bg-red-400 text-red-400 hover:text-white font-bold py-2 px-6 rounded-xl transition-all text-sm border border-red-400/20"
                  >
                    Delete Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ────────────────────────────────────────────────── */}
      {isCreating && (
        <div 
          onClick={() => setIsCreating(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-surface-container-high w-full max-w-md rounded-3xl border border-primary/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in duration-300 cursor-default"
          >
            <div className="p-8 border-b border-outline-variant/10 bg-surface-container-highest/20">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Building2 size={24} className="text-primary" /> Create New Workspace
              </h2>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1">Workspace Name</label>
                <input 
                  type="text" required autoFocus
                  placeholder="e.g. My Awesome Team"
                  value={newWs.name}
                  onChange={e => setNewWs({...newWs, name: e.target.value})}
                  className="w-full bg-surface-container-highest border border-outline-variant rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/40 text-on-surface transition-all placeholder:text-on-surface-variant/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] font-black text-on-surface-variant ml-1">URL Slug</label>
                <div className="relative group">
                   <input 
                    type="text" required
                    placeholder="my-team"
                    value={newWs.slug}
                    onChange={e => setNewWs({...newWs, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="w-full bg-surface-container-highest border border-outline-variant rounded-2xl px-5 py-4 text-sm pl-12 focus:ring-2 focus:ring-primary/40 text-on-surface font-mono transition-all placeholder:text-on-surface-variant/40"
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">/</span>
                </div>
                 <p className="text-[10px] text-on-surface-variant ml-1 font-medium italic opacity-80">Lowercase letters, numbers, and hyphens only.</p>
              </div>

              {createErr && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {createErr}
                </div>
              )}

              <div className="pt-6 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-4 bg-surface-container-highest border border-outline-variant text-sm font-bold rounded-2xl hover:bg-surface-container transition-all text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createLoading || !newWs.name || !newWs.slug}
                  className="flex-1 py-4 bg-primary text-on-primary-fixed text-sm font-black rounded-2xl hover:brightness-110 shadow-xl shadow-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {createLoading ? <RefreshCw size={18} className="animate-spin" /> : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
