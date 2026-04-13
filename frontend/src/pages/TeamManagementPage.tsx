import { useEffect, useState, useMemo } from 'react';
import {
  Users, UserCheck, Search, CheckCircle2, XCircle,
  Lock, Shield, RefreshCw, AlertTriangle
} from 'lucide-react';
import { adminApi, type AdminUser } from '@/api/admin';
import { useAuthStore } from '@/stores/authStore';

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  employee: { label: 'Employee', color: 'text-sky-400', bg: 'bg-sky-400/10 border border-sky-400/20' },
  guest:    { label: 'Guest',    color: 'text-violet-400', bg: 'bg-violet-400/10 border border-violet-400/20' },
};

const CURRENT_ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  superadmin: { label: 'Superadmin', color: 'text-amber-400', icon: '👑' },
  manager:    { label: 'Manager',    color: 'text-teal-400',  icon: '🛡️' },
  employee:   { label: 'Employee',   color: 'text-sky-400',   icon: '👤' },
  guest:      { label: 'Guest',      color: 'text-violet-400', icon: '🔗' },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return <span className="text-xs text-slate-500 italic">{role}</span>;
  return (
    <span className={`px-2 py-0.5 ${cfg.bg} ${cfg.color} text-[10px] font-bold uppercase tracking-widest rounded`}>
      {cfg.label}
    </span>
  );
}

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const INITIALS_COLORS = [
  'text-teal-400', 'text-sky-400', 'text-violet-400', 'text-rose-400', 'text-amber-400'
];

function getInitialsColor(name: string) {
  let hash = 0;
  for (const c of name) hash += c.charCodeAt(0);
  return INITIALS_COLORS[hash % INITIALS_COLORS.length];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamManagementPage() {
  const user = useAuthStore(s => s.user);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError]       = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const currentRoleCfg = CURRENT_ROLE_CONFIG[user?.system_role ?? 'employee'];

  // ── Fetch ──
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.listTeamUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Stats ──
  const totalUsers  = users.length;
  const activeCount = users.filter(u => u.is_active).length;
  const guestCount  = users.filter(u => u.system_role === 'guest').length;

  // ── Filter ──
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole   = roleFilter === 'all' || u.system_role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // ── Toggle Status ──
  const handleToggleStatus = async (u: AdminUser) => {
    setUpdatingId(u.id);
    try {
      await adminApi.updateUser(u.id, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
    } catch {
      setError('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-full bg-background text-on-surface p-8 space-y-8">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-headline text-on-surface">Team Management</h1>
              <p className="text-xs text-on-surface-variant">Manage your team's access and account status</p>
            </div>
          </div>
        </div>

        {/* Current Role Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-xl border border-outline-variant">
          <span className="text-base">{currentRoleCfg?.icon}</span>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Your Role</p>
            <p className={`text-sm font-bold ${currentRoleCfg?.color}`}>{currentRoleCfg?.label}</p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Team Members</p>
          <h3 className="text-3xl font-headline font-bold text-on-surface">{loading ? '—' : totalUsers}</h3>
          <div className="mt-2 text-[11px] text-primary flex items-center gap-1">
            <Users size={11} />
            Employee & Guest accounts
          </div>
        </div>

        <div className="bg-surface-container-low p-5 rounded-xl">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Now</p>
          <h3 className="text-3xl font-headline font-bold text-on-surface">{loading ? '—' : activeCount}</h3>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1">
            <UserCheck size={11} />
            Accounts with active status
          </div>
        </div>

        <div className="bg-surface-container-low p-5 rounded-xl">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Guest Accounts</p>
          <h3 className="text-3xl font-headline font-bold text-on-surface">{loading ? '—' : guestCount}</h3>
          <div className="mt-2 text-[11px] text-violet-400 flex items-center gap-1">
            <AlertTriangle size={11} />
            Limited access accounts
          </div>
        </div>
      </section>

      {/* ── User Table ───────────────────────────────────────────────────── */}
      <section className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">

        {/* Table Toolbar */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant">
          <div>
            <h2 className="text-base font-headline font-bold text-on-surface mb-0.5">Directory</h2>
            <p className="text-xs text-on-surface-variant">View and manage employee & guest accounts under your team.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-surface-container-highest px-3 py-2 rounded-lg border border-outline-variant focus-within:border-primary/40 transition-colors">
              <Search size={14} className="text-on-surface-variant" />
              <input
                type="text"
                placeholder="Filter by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none p-0 text-sm focus:ring-0 w-44 text-on-surface placeholder:text-on-surface-variant/40"
              />
            </div>
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-surface-container-highest border border-outline-variant text-xs font-semibold py-2 px-3 rounded-lg focus:ring-primary text-on-surface"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employee</option>
              <option value="guest">Guest</option>
            </select>
            {/* Refresh */}
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-highest rounded-lg transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container/40 border-b border-outline-variant/10">
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Toggle Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-9 w-48 bg-surface-container rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-surface-container rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-surface-container rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-8 bg-surface-container rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-on-surface-variant text-sm font-medium">
                    No team members found{search || roleFilter !== 'all' ? ' matching your filter' : ''}.
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-surface-container/20 transition-colors group">

                  {/* User Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-xs font-bold ${getInitialsColor(u.name)}`}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} className="w-full h-full object-cover rounded-lg" alt={u.name} />
                          : getInitials(u.name)
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{u.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <RoleBadge role={u.system_role} />
                  </td>

                  {/* Status indicator */}
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${u.is_active ? 'text-primary' : 'text-on-surface-variant'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-primary animate-pulse' : 'bg-on-surface-variant/40'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </td>

                  {/* Toggle Action */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={updatingId === u.id}
                      title={u.is_active ? 'Deactivate account' : 'Activate account'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 ${
                        u.is_active
                          ? 'text-error/80 hover:bg-error/10 border border-transparent hover:border-error/20'
                          : 'text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20'
                      }`}
                    >
                      {updatingId === u.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : u.is_active ? (
                        <><XCircle size={13} /> Deactivate</>
                      ) : (
                        <><CheckCircle2 size={13} /> Activate</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between">
            <p className="text-[11px] text-on-surface-variant">
              Showing {filtered.length} of {totalUsers} member{totalUsers !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
              <Lock size={11} />
              Manager & Superadmin accounts are not shown
            </div>
          </div>
        )}
      </section>

      {/* ── Info Notice ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/15 rounded-xl">
        <Shield size={14} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-on-surface-variant leading-relaxed">
          As a <span className="text-primary font-semibold">Manager</span>, you can activate or deactivate employee and guest accounts.
          To modify roles or delete accounts, please contact a Superadmin.
        </p>
      </div>
    </div>
  );
}
