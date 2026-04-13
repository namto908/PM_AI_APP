import { useEffect, useState } from 'react';
import { 
  UserPlus,
  Filter, 
  Edit2, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User as UserIcon,
  Timer,
  Trash2,
  Lock,
  X,
  Loader2
} from 'lucide-react';
import { adminApi, type AdminUser } from '@/api/admin';

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    system_role: 'employee'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await adminApi.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const newStatus = !user.is_active;
      await adminApi.updateUser(user.id, { is_active: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await adminApi.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUser(userId, { system_role: role });
      setUsers(users.map(u => u.id === userId ? { ...u, system_role: role } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    try {
      const { data } = await adminApi.createUser(formData);
      setUsers([data, ...users]);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        system_role: 'employee'
      });
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary font-bold uppercase tracking-wider rounded border border-primary/20">Superadmin</span>;
      case 'manager':
        return <span className="text-[10px] px-2 py-0.5 bg-secondary/20 text-secondary font-bold uppercase tracking-wider rounded border border-secondary/20">Manager</span>;
      case 'employee':
        return <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider rounded border border-outline-variant">Employee</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 bg-surface-container text-on-surface-variant/40 font-bold uppercase tracking-wider rounded border border-outline-variant">{role}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">User Management</h2>
          <p className="text-on-surface-variant text-sm mt-1">Configure user access, roles, and system-wide permissions across the network.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-5 py-2.5 bg-surface text-on-surface text-sm font-semibold rounded-xl hover:bg-surface-container transition-colors flex items-center justify-center gap-2 border border-outline-variant shadow-sm">
            <Filter size={16} />
            Advanced Filters
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none px-5 py-2.5 bg-primary text-on-primary-fixed text-sm font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
          >
            <UserPlus size={16} />
            Add New User
          </button>
        </div>
      </div>

      {/* Bento Layout Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main User Table (Left 8 Columns) */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            {/* Table Search & Tool Bar */}
            <div className="p-5 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="w-full bg-surface-container-highest/50 border-outline-variant rounded-xl text-sm pl-10 focus:ring-1 focus:ring-primary/20 text-on-surface"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Active Users:</span>
                  <span className="text-sm font-bold text-primary">{users.filter(u => u.is_active).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Total:</span>
                  <span className="text-sm font-bold text-on-surface">{users.length}</span>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/50 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-10 w-40 bg-surface-container rounded-lg"></div></td>
                        <td className="px-6 py-4"><div className="h-6 w-20 bg-surface-container rounded-lg"></div></td>
                        <td className="px-6 py-4"><div className="h-6 w-16 bg-surface-container rounded-lg"></div></td>
                        <td className="px-6 py-4"><div className="h-6 w-10 bg-surface-container rounded-lg ml-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant/40">No users found matching your search.</td>
                    </tr>
                  ) : filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-primary overflow-hidden">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon size={20} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-on-surface">{user.name}</p>
                              {user.is_root && <Lock size={12} className="text-primary/50" />}
                            </div>
                            <p className="text-xs text-on-surface-variant/50">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {getRoleBadge(user.system_role)}
                          <select 
                            className="bg-transparent border-none p-0 text-[10px] font-medium focus:ring-0 cursor-pointer text-on-surface-variant/40 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            value={user.system_role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            disabled={user.is_root}
                          >
                            <option value="manager">Manager</option>
                            <option value="employee">Employee</option>
                            <option value="guest">Guest</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.is_root}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            user.is_active 
                              ? 'text-primary' 
                              : 'text-on-surface-variant/30'
                          }`}
                        >
                          {user.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span className="text-xs font-medium">{user.is_active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            disabled={user.is_root}
                            className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.is_root}
                            className="p-2 text-on-surface-variant/40 hover:text-error transition-colors hover:bg-error/5 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-5 flex items-center justify-between border-t border-outline-variant bg-surface-container/20">
              <p className="text-xs text-on-surface-variant/40">Showing 1-10 of {filteredUsers.length} users</p>
              <div className="flex gap-2">
                <button className="w-9 h-9 flex items-center justify-center bg-surface-container border border-outline-variant rounded-xl text-on-surface-variant/40 hover:bg-surface-container-highest transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary-fixed rounded-xl text-xs font-bold shadow-sm">1</button>
                <button className="w-9 h-9 flex items-center justify-center bg-surface-container border border-outline-variant rounded-xl text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-bold">2</button>
                <button className="w-9 h-9 flex items-center justify-center bg-surface-container border border-outline-variant rounded-xl text-on-surface-variant/40 hover:bg-surface-container-highest transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards (Right 4 Columns) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Permission Matrix Preview */}
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert size={80} />
            </div>
            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2 text-on-surface">
              <ShieldCheck className="text-primary" size={20} />
              Role Matrix
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-surface-container rounded-xl border border-outline-variant">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Superadmin Access</span>
                  <div className="flex gap-1">
                    {['R', 'W', 'D', 'A'].map(p => (
                      <div key={p} className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] text-primary font-bold">{p}</div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/50 leading-relaxed">Full system access, node management, and security overrides.</p>
              </div>
              <div className="p-4 bg-surface-container rounded-xl border border-outline-variant opactiy-60">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Manager Access</span>
                  <div className="flex gap-1">
                    {['R', 'W', 'D'].map(p => (
                      <div key={p} className="w-5 h-5 rounded bg-secondary/10 border border-secondary/20 flex items-center justify-center text-[8px] text-secondary font-bold">{p}</div>
                    ))}
                    <div className="w-5 h-5 rounded bg-surface-container-highest border border-outline-variant flex items-center justify-center text-[8px] text-on-surface/20 font-bold">A</div>
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/50 leading-relaxed">Resource planning, member management, and task approval flow.</p>
              </div>
            </div>
            <button className="w-full mt-6 py-3 bg-surface-container-highest text-on-surface text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-surface-container-high transition-all border border-outline-variant">
              Edit Hierarchy
            </button>
          </div>

          {/* Audit Logs Quick View */}
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6">
            <h3 className="text-lg font-bold font-headline mb-5 flex items-center gap-2 text-on-surface">
              <Timer className="text-tertiary" size={20} />
              Recent Audit
            </h3>
            <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border-dim">
              <div className="flex gap-4 relative">
                <div className="w-3.5 h-3.5 rounded-full bg-primary border-4 border-surface z-10"></div>
                <div>
                  <p className="text-xs text-on-surface font-bold">Role Escalation</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Elias promoted Sarah Chen to Manager</p>
                  <p className="text-[9px] text-on-surface-variant/30 font-bold tracking-wider uppercase mt-1">14:23 · Today</p>
                </div>
              </div>
              <div className="flex gap-4 relative">
                <div className="w-3.5 h-3.5 rounded-full bg-error border-4 border-surface z-10"></div>
                <div>
                  <p className="text-xs text-on-surface font-bold">Node Shutdown</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">System auto-deactivated Marcus for inactivity</p>
                  <p className="text-[9px] text-on-surface-variant/30 font-bold tracking-wider uppercase mt-1">09:12 · Today</p>
                </div>
              </div>
              <div className="flex gap-4 relative">
                <div className="w-3.5 h-3.5 rounded-full bg-secondary border-4 border-surface z-10"></div>
                <div>
                  <p className="text-xs text-on-surface font-bold">Invite Sent</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">External invite sent to engineering@nexus.ai</p>
                  <p className="text-[9px] text-on-surface-variant/30 font-bold tracking-wider uppercase mt-1">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-background/95 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
          />
          <div className="bg-surface w-full max-w-md rounded-3xl border border-outline-variant shadow-2xl relative z-10 animate-in zoom-in-95 fade-in duration-300 overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/30">
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Add New User</h3>
                <p className="text-xs text-on-surface-variant/50 mt-1">Create a new system account</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs font-medium flex items-center gap-2">
                  <ShieldAlert size={14} />
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter full name"
                    className="w-full bg-surface-container-highest/50 border-outline-variant rounded-xl text-sm focus:ring-1 focus:ring-primary/20 text-on-surface px-4 py-2.5"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest ml-1">Username</label>
                    <input 
                      type="text"
                      required
                      placeholder="username"
                      className="w-full bg-surface-container-highest/50 border-outline-variant rounded-xl text-sm focus:ring-1 focus:ring-primary/20 text-on-surface px-4 py-2.5"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest ml-1">System Role</label>
                    <select 
                      className="w-full bg-surface-container-highest/50 border-outline-variant rounded-xl text-sm focus:ring-1 focus:ring-primary/20 text-on-surface px-4 py-2.5"
                      value={formData.system_role}
                      onChange={(e) => setFormData({...formData, system_role: e.target.value})}
                    >
                      <option value="manager" className="bg-surface">Manager</option>
                      <option value="employee" className="bg-surface">Employee</option>
                      <option value="guest" className="bg-surface">Guest</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="w-full bg-surface-container-highest/50 border-outline-variant rounded-xl text-sm focus:ring-1 focus:ring-primary/20 text-on-surface px-4 py-2.5"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest ml-1">Initial Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-surface-container-highest/50 border-outline-variant rounded-xl text-sm focus:ring-1 focus:ring-primary/20 text-on-surface px-4 py-2.5"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-surface-container text-on-surface text-sm font-semibold rounded-xl hover:bg-surface-container-highest transition-colors border border-outline-variant"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-on-primary-fixed text-sm font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
