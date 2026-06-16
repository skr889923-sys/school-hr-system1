import { UserRole } from '../types';

export type Permission =
  | 'requests.readAll'
  | 'requests.readAssigned'
  | 'requests.create'
  | 'requests.forward'
  | 'requests.return'
  | 'requests.approve'
  | 'requests.reject'
  | 'requests.archive'
  | 'requests.attachAdminFiles'
  | 'templates.manage'
  | 'employees.read'
  | 'employees.manage'
  | 'audit.read'
  | 'notifications.read'
  | 'settings.manage'
  | 'profile.sign';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  principal: [
    'requests.readAll',
    'requests.approve',
    'requests.reject',
    'requests.return',
    'requests.archive',
    'employees.read',
    'employees.manage',
    'audit.read',
    'notifications.read',
    'settings.manage',
    'profile.sign',
  ],
  hr_manager: [
    'requests.readAll',
    'requests.create',
    'requests.forward',
    'requests.return',
    'requests.archive',
    'requests.attachAdminFiles',
    'templates.manage',
    'employees.read',
    'employees.manage',
    'audit.read',
    'notifications.read',
    'profile.sign',
  ],
  it_support: [
    'requests.readAll',
    'requests.attachAdminFiles',
    'templates.manage',
    'audit.read',
    'notifications.read',
    'profile.sign',
  ],
  employee: ['requests.readAssigned', 'profile.sign', 'notifications.read'],
  unassigned: [],
  system: [
    'requests.readAll',
    'requests.create',
    'requests.forward',
    'requests.return',
    'requests.approve',
    'requests.reject',
    'requests.archive',
    'requests.attachAdminFiles',
    'templates.manage',
    'employees.read',
    'employees.manage',
    'audit.read',
    'notifications.read',
    'settings.manage',
    'profile.sign',
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  principal: 'مدير المدرسة',
  hr_manager: 'مشرف المتابعة',
  it_support: 'الدعم الفني',
  employee: 'الموظف / المعلم',
  unassigned: 'غير محدد',
  system: 'النظام',
};

const ROLE_INITIALS: Record<UserRole, string> = {
  principal: 'MD',
  hr_manager: 'HR',
  it_support: 'IT',
  employee: 'EMP',
  unassigned: '--',
  system: 'SYS',
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function getRoleLabel(role: UserRole | null | undefined): string {
  return role ? ROLE_LABELS[role] || role : ROLE_LABELS.unassigned;
}

export function getRoleInitials(role: UserRole | null | undefined): string {
  return role ? ROLE_INITIALS[role] || '--' : '--';
}

export function isAdministrativeRole(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'requests.readAll');
}
