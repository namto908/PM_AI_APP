import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import client from '../api/client';
import { adminApi, type AdminUser, type WorkspaceMember, type Group } from '../api/admin';
import { usePermissions } from '../hooks/usePermissions';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = 'profile' | 'workspace' | 'members' | 'groups' | 'admin_users' | 'notifications' | 'appearance' | 'security';

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface NotifPrefs {
  emailDigest: boolean;
  pushNotifs: boolean;
  criticalAlerts: boolean;
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

const IconUser = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconBuilding = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconBell = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconPalette = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.976.804-1.562 1.875-1.562H16c2.21 0 4-1.79 4-4 0-4.97-4.03-9-8-9z" />
  </svg>
);
const IconShield = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconSun = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const IconMoon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const IconKey = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

function IconEye({ show }: { show: boolean }) {
  return show ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-on-surface font-headline">{title}</h2>
      <p className="text-sm text-on-surface-variant/70 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Divider() {
  return <hr className="border-outline-variant/30" />;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-sm text-on-surface bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 shadow-sm">{value}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: () => void; label: string; description: string;
}) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-low transition-colors px-1 -mx-1 rounded-lg">
      <div>
        <p className="text-sm font-bold text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant mt-1">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface ${
          checked ? 'bg-primary' : 'bg-surface-container-highest'
        }`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function PasswordInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 pr-12 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <IconEye show={show} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const NOTIF_KEY = 'taskops-notif-prefs';
const FONT_KEY  = 'taskops-font-size';

const NAV_ITEMS_BASE: { id: SectionId; label: string; Icon: React.FC }[] = [
  { id: 'profile',       label: 'User Profile',   Icon: IconUser     },
  { id: 'workspace',     label: 'Workspace',       Icon: IconBuilding },
  { id: 'notifications', label: 'Notifications',   Icon: IconBell     },
  { id: 'appearance',    label: 'Appearance',      Icon: IconPalette  },
  { id: 'security',      label: 'Security & Keys', Icon: IconShield   },
];

const ALL_SECTION_REFS: SectionId[] = ['profile', 'workspace', 'members', 'groups', 'admin_users', 'notifications', 'appearance', 'security'];

export default function SettingsPage() {
  const { user, token, setAuth } = useAuthStore();
  const { theme, toggleTheme }   = useThemeStore();
  const { activeWorkspaceId }    = useWorkspaceStore();
  const { canManageMembers, canCreateGroup, canManageUsers } = usePermissions();

  // Build nav items dynamically based on permissions
  const navItems = [
    ...NAV_ITEMS_BASE.slice(0, 2),
    ...(canManageMembers() ? [{ id: 'members' as SectionId, label: 'Members', Icon: IconUser }] : []),
    ...(canCreateGroup()   ? [{ id: 'groups'  as SectionId, label: 'Groups',  Icon: IconBuilding }] : []),
    ...(canManageUsers()   ? [{ id: 'admin_users' as SectionId, label: 'Users (Admin)', Icon: IconShield }] : []),
    ...NAV_ITEMS_BASE.slice(2),
  ];

  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>(
    Object.fromEntries(ALL_SECTION_REFS.map(id => [id, null])) as Record<SectionId, HTMLElement | null>
  );

  // ── Members state ──
  const [members, setMembers]               = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole]   = useState('employee');
  const [memberSaving, setMemberSaving]     = useState(false);
  const [memberErr, setMemberErr]           = useState('');

  // ── Groups state ──
  const [groups, setGroups]             = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupSaving, setGroupSaving]   = useState(false);

  // ── Admin users state ──
  const [adminUsers, setAdminUsers]             = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  // ── Profile ──
  const [profileName,   setProfileName]   = useState(user?.name  ?? '');
  const [profileEmail,  setProfileEmail]  = useState(user?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [profileErr,    setProfileErr]    = useState('');

  // ── Password modal ──
  const [pwdOpen,   setPwdOpen]   = useState(false);
  const [curPwd,    setCurPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confPwd,   setConfPwd]   = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [pwdErr,    setPwdErr]    = useState('');

  // ── Workspace ──
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);

  // ── Notification prefs ──
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? ''); }
    catch { return { emailDigest: true, pushNotifs: false, criticalAlerts: true }; }
  });

  // ── Font size ──
  const [fontSize, setFontSize] = useState<number>(() => {
    const v = Number(localStorage.getItem(FONT_KEY));
    return v >= 12 && v <= 20 ? v : 14;
  });

  // Sync user → form
  useEffect(() => {
    if (user) { setProfileName(user.name); setProfileEmail(user.email); }
  }, [user]);

  // Load workspace info
  useEffect(() => {
    if (!activeWorkspaceId) return;
    client.get<WorkspaceInfo[]>('/auth/workspaces')
      .then(res => {
        const ws = res.data.find(w => String(w.id) === String(activeWorkspaceId));
        if (ws) setWorkspace(ws);
      })
      .catch(() => {});
  }, [activeWorkspaceId]);

  // Load members when section becomes visible
  useEffect(() => {
    if (!activeWorkspaceId || !canManageMembers()) return;
    setMembersLoading(true);
    adminApi.listMembers(activeWorkspaceId)
      .then(res => setMembers(res.data))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [activeWorkspaceId]);

  // Load groups
  useEffect(() => {
    if (!activeWorkspaceId || !canCreateGroup()) return;
    setGroupsLoading(true);
    adminApi.listGroups(activeWorkspaceId)
      .then(res => setGroups(res.data))
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  }, [activeWorkspaceId]);

  // Load admin users
  useEffect(() => {
    if (!canManageUsers()) return;
    setAdminUsersLoading(true);
    adminApi.listUsers()
      .then(res => setAdminUsers(res.data))
      .catch(() => {})
      .finally(() => setAdminUsersLoading(false));
  }, []);

  // Apply & persist font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem(FONT_KEY, String(fontSize));
  }, [fontSize]);

  // Intersection observer → highlight active sidebar item
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id as SectionId);
      },
      { rootMargin: '-5% 0px -75% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProfileSave = async () => {
    if (!profileName.trim()) { setProfileErr('Name cannot be empty'); setProfileStatus('err'); return; }
    setProfileSaving(true); setProfileStatus('idle'); setProfileErr('');
    try {
      const res = await client.patch('/auth/me', { name: profileName.trim(), email: profileEmail });
      if (token) setAuth(token, res.data);
      setProfileStatus('ok');
      setTimeout(() => setProfileStatus('idle'), 3000);
    } catch (e: any) {
      setProfileErr(e.response?.data?.detail ?? 'Failed to save profile');
      setProfileStatus('err');
    } finally { setProfileSaving(false); }
  };

  const handlePasswordSave = async () => {
    if (newPwd !== confPwd) { setPwdErr('New passwords do not match'); setPwdStatus('err'); return; }
    setPwdSaving(true); setPwdStatus('idle'); setPwdErr('');
    try {
      await client.post('/auth/me/change-password', { current_password: curPwd, new_password: newPwd });
      setPwdStatus('ok');
      setTimeout(() => {
        setPwdOpen(false); setCurPwd(''); setNewPwd(''); setConfPwd('');
        setPwdStatus('idle'); setPwdErr('');
      }, 1500);
    } catch (e: any) {
      setPwdErr(e.response?.data?.detail ?? 'Failed to change password');
      setPwdStatus('err');
    } finally { setPwdSaving(false); }
  };

  const toggleNotif = (key: keyof NotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  const closePwdModal = () => {
    setPwdOpen(false); setCurPwd(''); setNewPwd(''); setConfPwd('');
    setPwdStatus('idle'); setPwdErr('');
  };

  const initials = (user?.name ?? '?')
    .split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const fontSizeLabel = fontSize <= 13 ? 'Small' : fontSize <= 15 ? 'Medium' : fontSize <= 17 ? 'Large' : 'X-Large';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 border-r border-outline-variant flex flex-col py-8 overflow-y-auto bg-surface/30">
        <p className="px-6 mb-4 text-[10px] font-black tracking-[0.2em] uppercase text-on-surface-variant/40">
          Settings
        </p>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ id, label, Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left w-full group ${
                  active
                    ? 'bg-primary/10 text-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className={`transition-colors ${active ? 'text-primary' : 'text-on-surface-variant/50 group-hover:text-primary/70'}`}>
                  <Icon />
                </span>
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main scroll area ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-10 px-8 space-y-12">

          {/* ═══ 1. User Profile ═══ */}
          <section id="profile" ref={el => { sectionRefs.current.profile = el; }}>
            <SectionHeader title="User Profile" subtitle="Update your display name, email and password" />

            {/* Avatar row */}
            <div className="mt-8 flex items-center gap-6 p-6 bg-surface rounded-3xl border border-outline-variant/50 shadow-sm">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary-fixed text-2xl font-black select-none flex-shrink-0 overflow-hidden shadow-lg">
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-on-surface truncate">{user?.name ?? '—'}</p>
                <p className="text-sm text-on-surface-variant/70 mt-0.5 truncate">{user?.email ?? '—'}</p>
                {user?.system_role && (
                  <span className={`inline-block mt-3 text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-lg ${
                    user.system_role === 'superadmin' ? 'bg-error-container text-on-error-container' :
                    user.system_role === 'manager'    ? 'bg-secondary-container text-on-secondary-container' :
                    user.system_role === 'guest'      ? 'bg-surface-container-highest text-on-surface-variant' :
                    'bg-primary-container text-on-primary-container'
                  }`}>
                    {user.system_role}
                  </span>
                )}
              </div>
            </div>

            {/* Editable fields */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
                />
              </div>
            </div>

            {/* Action buttons + status */}
            <div className="mt-6 flex items-center gap-4 flex-wrap">
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:brightness-110 disabled:opacity-60 text-on-primary-fixed text-sm font-bold transition-all shadow-md shadow-primary/10"
              >
                {profileSaving && <Spinner />}
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => { setPwdOpen(true); setPwdStatus('idle'); setPwdErr(''); }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-outline-variant text-sm text-on-surface-variant font-bold hover:bg-surface-container hover:text-on-surface transition-all"
              >
                Change Password
              </button>
              {profileStatus === 'ok' && (
                <span className="inline-flex items-center gap-2 text-sm text-success font-bold">
                  <IconCheck /> Saved
                </span>
              )}
              {profileStatus === 'err' && (
                <span className="text-sm text-error font-bold">{profileErr}</span>
              )}
            </div>
          </section>

          <Divider />

          {/* ═══ 2. Workspace ═══ */}
          <section id="workspace" ref={el => { sectionRefs.current.workspace = el; }}>
            <SectionHeader title="Workspace" subtitle="Details about your current workspace" />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-surface-container-low rounded-3xl border border-outline-variant/30">
              <InfoField label="Workspace Name" value={workspace?.name ?? '—'} />
              <InfoField label="Workspace Slug"  value={workspace ? `/${workspace.slug}` : '—'} />
              <InfoField label="Your Role"       value={workspace ? workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1) : '—'} />
              <InfoField label="Region"          value="Global" />
            </div>
            <p className="mt-4 text-xs text-on-surface-variant italic">
              Workspace name and slug can be managed by the workspace owner.
            </p>
          </section>

          <Divider />

          {/* ═══ Members ═══ */}
          {canManageMembers() && (
            <>
              <section id="members" ref={el => { sectionRefs.current.members = el; }}>
                <SectionHeader title="Members" subtitle="Manage workspace members and their roles" />
                {membersLoading ? (
                  <p className="text-sm text-on-surface-variant mt-4">Loading members…</p>
                ) : (
                  <div className="mt-6 rounded-2xl bg-surface border border-outline-variant divide-y divide-outline-variant/30 shadow-sm overflow-hidden">
                    {members.length === 0 && <p className="px-6 py-4 text-sm text-on-surface-variant italic">No members found.</p>}
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{m.user_id}</p>
                          <p className="text-[11px] text-on-surface-variant">Joined: {new Date(m.joined_at).toLocaleDateString()}</p>
                        </div>
                        <select
                          value={m.role}
                          disabled={m.role === 'owner'}
                          onChange={async (e) => {
                            if (!activeWorkspaceId) return;
                            try {
                              await adminApi.updateMemberRole(activeWorkspaceId, m.user_id, e.target.value);
                              const res = await adminApi.listMembers(activeWorkspaceId);
                              setMembers(res.data);
                            } catch {}
                          }}
                          className="bg-input border border-slate-200 dark:border-transparent rounded-lg px-3 py-1.5 text-xs text-text1 focus:outline-none disabled:opacity-50"
                        >
                          {['owner', 'manager', 'employee', 'guest'].map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                        {m.role !== 'owner' && (
                          <button
                            onClick={async () => {
                              if (!activeWorkspaceId) return;
                              try {
                                await adminApi.removeMember(activeWorkspaceId, m.user_id);
                                setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
                              } catch {}
                            }}
                            className="text-xs text-[#ffb4ab] hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={addMemberEmail}
                    onChange={e => setAddMemberEmail(e.target.value)}
                    placeholder="User ID (UUID) to add…"
                    className="flex-1 bg-input border border-slate-200 dark:border-transparent rounded-xl px-4 py-2.5 text-sm text-text1 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30"
                  />
                  <select value={addMemberRole} onChange={e => setAddMemberRole(e.target.value)}
                    className="bg-input border border-slate-200 dark:border-transparent rounded-xl px-3 py-2.5 text-sm text-text1 focus:outline-none">
                    {['manager', 'employee', 'guest'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button
                    disabled={!addMemberEmail.trim() || memberSaving}
                    onClick={async () => {
                      if (!activeWorkspaceId || !addMemberEmail.trim()) return;
                      setMemberSaving(true); setMemberErr('');
                      try {
                        await adminApi.addMember(activeWorkspaceId, addMemberEmail.trim(), addMemberRole);
                        const res = await adminApi.listMembers(activeWorkspaceId);
                        setMembers(res.data);
                        setAddMemberEmail('');
                      } catch (e: any) {
                        setMemberErr(e.response?.data?.detail ?? 'Failed to add member');
                      } finally { setMemberSaving(false); }
                    }}
                    className="bg-[#6bd8cb] text-[#003732] font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-all"
                  >
                    {memberSaving ? 'Adding…' : 'Add'}
                  </button>
                </div>
                {memberErr && <p className="mt-2 text-xs text-[#ffb4ab]">{memberErr}</p>}
              </section>
              <Divider />
            </>
          )}

          {/* ═══ Groups ═══ */}
          {canCreateGroup() && (
            <>
              <section id="groups" ref={el => { sectionRefs.current.groups = el; }}>
                <SectionHeader title="Groups" subtitle="Organise workspace members into groups" />
                {groupsLoading ? (
                  <p className="text-sm text-slate-400 mt-4">Loading groups…</p>
                ) : (
                  <div className="mt-4 rounded-xl bg-card border border-slate-200 dark:border-white/8 divide-y divide-slate-100 dark:divide-white/5">
                    {groups.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">No groups yet.</p>}
                    {groups.map(g => (
                      <div key={g.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text1">{g.name}</p>
                          <p className="text-[11px] text-slate-400">ID: {g.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="New group name…"
                    className="flex-1 bg-input border border-slate-200 dark:border-transparent rounded-xl px-4 py-2.5 text-sm text-text1 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6bd8cb]/30"
                  />
                  <button
                    disabled={!newGroupName.trim() || groupSaving}
                    onClick={async () => {
                      if (!activeWorkspaceId || !newGroupName.trim()) return;
                      setGroupSaving(true);
                      try {
                        const res = await adminApi.createGroup(activeWorkspaceId, newGroupName.trim());
                        setGroups(prev => [res.data, ...prev]);
                        setNewGroupName('');
                      } catch {} finally { setGroupSaving(false); }
                    }}
                    className="bg-[#6bd8cb] text-[#003732] font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-all"
                  >
                    {groupSaving ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </section>
              <Divider />
            </>
          )}

          {/* ═══ Admin: Users ═══ */}
          {canManageUsers() && (
            <>
              <section id="admin_users" ref={el => { sectionRefs.current.admin_users = el; }}>
                <SectionHeader title="Users (Admin)" subtitle="View and manage all user accounts and system roles" />
                {adminUsersLoading ? (
                  <p className="text-sm text-slate-400 mt-4">Loading users…</p>
                ) : (
                  <div className="mt-4 rounded-xl bg-card border border-slate-200 dark:border-white/8 divide-y divide-slate-100 dark:divide-white/5">
                    {adminUsers.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">No users found.</p>}
                    {adminUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text1">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                        <select
                          value={u.system_role}
                          onChange={async (e) => {
                            try {
                              await adminApi.updateUser(u.id, { system_role: e.target.value });
                              setAdminUsers(prev => prev.map(x => x.id === u.id ? { ...x, system_role: e.target.value } : x));
                            } catch {}
                          }}
                          className="bg-input border border-slate-200 dark:border-transparent rounded-lg px-3 py-1.5 text-xs text-text1 focus:outline-none"
                        >
                          {['superadmin', 'manager', 'employee', 'guest'].map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            try {
                              await adminApi.updateUser(u.id, { is_active: u.is_active === false });
                              setAdminUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: u.is_active === false } : x));
                            } catch {}
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                            u.is_active === false
                              ? 'bg-[#6bd8cb]/10 text-[#6bd8cb] hover:bg-[#6bd8cb]/20'
                              : 'bg-red-500/10 text-[#ffb4ab] hover:bg-red-500/20'
                          }`}
                        >
                          {u.is_active === false ? 'Activate' : 'Deactivate'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <Divider />
            </>
          )}

          {/* ═══ 3. Notifications ═══ */}
          <section id="notifications" ref={el => { sectionRefs.current.notifications = el; }}>
            <SectionHeader title="Notifications" subtitle="Choose how you want to be notified" />
            <div className="mt-8 rounded-2xl bg-surface border border-outline-variant px-6 shadow-sm">
              <Toggle
                checked={notifPrefs.emailDigest}
                onChange={() => toggleNotif('emailDigest')}
                label="Email Digest"
                description="Receive a daily summary of workspace activity"
              />
              <Toggle
                checked={notifPrefs.pushNotifs}
                onChange={() => toggleNotif('pushNotifs')}
                label="Push Notifications"
                description="Real-time browser notifications for mentions and updates"
              />
              <Toggle
                checked={notifPrefs.criticalAlerts}
                onChange={() => toggleNotif('criticalAlerts')}
                label="Critical Alerts"
                description="Always get notified about critical system or AI events"
              />
            </div>
            <p className="mt-4 text-xs text-on-surface-variant italic">
              Preferences are stored locally in your browser.
            </p>
          </section>

          <Divider />

          {/* ═══ 4. Appearance ═══ */}
          <section id="appearance" ref={el => { sectionRefs.current.appearance = el; }}>
            <SectionHeader title="Appearance" subtitle="Customize the look and feel of the interface" />

            {/* Theme selector */}
            <div className="mt-8 rounded-2xl bg-surface border border-outline-variant p-6 shadow-sm">
              <p className="text-sm font-bold text-on-surface mb-6 uppercase tracking-wider">Color Theme</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { if (theme === 'dark') toggleTheme(); }}
                  className={`flex-1 flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all group ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${theme === 'light' ? 'bg-gradient-to-br from-amber-300 to-orange-400' : 'bg-surface-container-highest'}`}>
                    <IconSun />
                  </div>
                  <div className="text-center">
                    <span className={`text-sm font-bold block ${theme === 'light' ? 'text-primary' : 'text-on-surface-variant'}`}>
                      Light Mode
                    </span>
                    {theme === 'light' && (
                      <span className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 block">Active</span>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => { if (theme === 'light') toggleTheme(); }}
                  className={`flex-1 flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all group ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${theme === 'dark' ? 'bg-gradient-to-br from-primary to-primary-container' : 'bg-surface-container-highest'}`}>
                    <IconMoon />
                  </div>
                  <div className="text-center">
                    <span className={`text-sm font-bold block ${theme === 'dark' ? 'text-primary' : 'text-on-surface-variant'}`}>
                      Dark Mode
                    </span>
                    {theme === 'dark' && (
                      <span className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 block">Active</span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Font size slider */}
            <div className="mt-6 rounded-2xl bg-surface border border-outline-variant p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-on-surface uppercase tracking-wider">Font Size</p>
                <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full">{fontSize}px · {fontSizeLabel}</span>
              </div>
              <input
                type="range"
                min={12}
                max={20}
                step={1}
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer h-2 bg-surface-container rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                <span>Small (12px)</span>
                <span>X-Large (20px)</span>
              </div>
            </div>
          </section>

          <Divider />

          {/* ═══ 5. Security & Keys ═══ */}
          <section id="security" ref={el => { sectionRefs.current.security = el; }} className="pb-10">
            <SectionHeader title="Security & Keys" subtitle="Manage API keys for integrations" />

            <div className="mt-6 rounded-xl bg-card border border-slate-200 dark:border-white/8 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/8">
                <span>Name</span>
                <span>Created</span>
                <span>Action</span>
              </div>
              {/* Rows */}
              {([
                { name: 'Production Key',   created: 'Jan 12, 2025', preview: 'sk-…4f2a' },
                { name: 'Development Key',  created: 'Feb 3, 2025',  preview: 'sk-…9c1b' },
              ] as const).map(row => (
                <div key={row.name} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-500 dark:text-indigo-400 flex-shrink-0"><IconKey /></span>
                    <div>
                      <p className="text-sm font-medium text-text1">{row.name}</p>
                      <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5">{row.preview}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.created}</span>
                  <button className="text-xs text-red-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
                    Revoke
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                <IconKey /> Generate New Key
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              API key management is a preview — full backend integration coming soon.
            </p>
          </section>

        </div>
      </main>

      {/* ── Change Password Modal ──────────────────────────────────────── */}
      {pwdOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closePwdModal(); }}
        >
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-text1 mb-1">Change Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Enter your current password and choose a new one (min. 8 characters).
            </p>

            <div className="space-y-3">
              <PasswordInput label="Current Password"     value={curPwd}  onChange={setCurPwd}  />
              <PasswordInput label="New Password"         value={newPwd}  onChange={setNewPwd}  />
              <PasswordInput label="Confirm New Password" value={confPwd} onChange={setConfPwd} />
            </div>

            {pwdStatus === 'ok' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-lg">
                <IconCheck /> Password changed successfully!
              </div>
            )}
            {pwdStatus === 'err' && pwdErr && (
              <p className="mt-3 text-sm text-red-400">{pwdErr}</p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closePwdModal}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSave}
                disabled={pwdSaving || !curPwd || !newPwd || !confPwd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {pwdSaving && <Spinner />}
                {pwdSaving ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
