import { useAuthStore } from '@/stores/authStore';

const ROLE_ORDER = ['guest', 'employee', 'manager', 'superadmin'] as const;
type SystemRole = typeof ROLE_ORDER[number];

function roleGte(userRole: string, minimum: SystemRole): boolean {
  const userIdx = ROLE_ORDER.indexOf(userRole as SystemRole);
  const minIdx = ROLE_ORDER.indexOf(minimum);
  return userIdx >= minIdx && userIdx !== -1;
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const systemRole = (user?.system_role ?? 'employee') as string;

  return {
    systemRole,

    /** Can view and restore tasks from the trash */
    canRestoreTask: () => roleGte(systemRole, 'manager'),

    /** Can create / manage groups inside a workspace */
    canCreateGroup: () => roleGte(systemRole, 'manager'),

    /** Can add/remove workspace members */
    canManageMembers: () => roleGte(systemRole, 'manager'),

    /** Full system admin: user management, role assignment */
    canManageUsers: () => systemRole === 'superadmin',

    /** At least manager level */
    isManagerOrAbove: () => roleGte(systemRole, 'manager'),

    /** At least employee level (default authenticated user) */
    isEmployee: () => roleGte(systemRole, 'employee'),

    /** Read-only guest */
    isGuest: () => systemRole === 'guest',

    /** Create/edit/delete tasks */
    canWriteTasks: () => roleGte(systemRole, 'employee'),
  };
}
