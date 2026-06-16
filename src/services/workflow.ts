import { RequestStatus, UserRole } from '../types';
import { hasPermission, Permission } from './rbac';

export interface StatusMeta {
  label: string;
  shortLabel: string;
  tone: 'slate' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'rose';
  description: string;
}

export const REQUEST_STATUS_META: Record<RequestStatus, StatusMeta> = {
  draft: {
    label: 'مسودة',
    shortLabel: 'مسودة',
    tone: 'slate',
    description: 'لم يتم توجيه الطلب بعد.',
  },
  assigned: {
    label: 'موجهة للموظف',
    shortLabel: 'موجهة',
    tone: 'amber',
    description: 'تم توجيه الطلب وينتظر رد الموظف.',
  },
  pending_employee_response: {
    label: 'بانتظار رد الموظف',
    shortLabel: 'بانتظار الموظف',
    tone: 'amber',
    description: 'تم توجيه الطلب وينتظر رد الموظف.',
  },
  in_progress: {
    label: 'قيد التعبئة',
    shortLabel: 'قيد التعبئة',
    tone: 'blue',
    description: 'بدأ الموظف تعبئة الطلب ولم يرسله بعد.',
  },
  submitted_by_employee: {
    label: 'مرسلة للمراجعة',
    shortLabel: 'قيد المراجعة',
    tone: 'blue',
    description: 'أرسل الموظف الطلب لمراجعة مشرف المتابعة.',
  },
  forwarded_to_principal: {
    label: 'لدى مدير المدرسة',
    shortLabel: 'لدى المدير',
    tone: 'indigo',
    description: 'رفع مشرف المتابعة الطلب لاعتماد مدير المدرسة.',
  },
  returned: {
    label: 'معادة للتعديل',
    shortLabel: 'معادة',
    tone: 'amber',
    description: 'أعيد الطلب للموظف لاستكمال البيانات.',
  },
  approved: {
    label: 'معتمدة',
    shortLabel: 'معتمد',
    tone: 'emerald',
    description: 'اعتمد مدير المدرسة الطلب.',
  },
  rejected: {
    label: 'مرفوضة',
    shortLabel: 'مرفوض',
    tone: 'rose',
    description: 'تم رفض الطلب مع توثيق السبب.',
  },
  completed: {
    label: 'مكتملة',
    shortLabel: 'مكتمل',
    tone: 'emerald',
    description: 'أغلق الطلب وحفظ في الأرشيف التشغيلي.',
  },
  archived: {
    label: 'مؤرشفة',
    shortLabel: 'مؤرشف',
    tone: 'slate',
    description: 'حفظ الطلب في الأرشيف ولا يقبل التعديل المعتاد.',
  },
};

const TRANSITION_PERMISSIONS: Partial<Record<RequestStatus, Partial<Record<RequestStatus, Permission | 'employee'>>>> = {
  draft: {
    assigned: 'requests.create',
    pending_employee_response: 'requests.create',
    archived: 'requests.archive',
  },
  assigned: {
    submitted_by_employee: 'employee',
    archived: 'requests.archive',
  },
  pending_employee_response: {
    submitted_by_employee: 'employee',
    archived: 'requests.archive',
  },
  in_progress: {
    submitted_by_employee: 'employee',
    archived: 'requests.archive',
  },
  returned: {
    archived: 'requests.archive',
  },
  submitted_by_employee: {
    forwarded_to_principal: 'requests.forward',
    archived: 'requests.archive',
  },
  forwarded_to_principal: {
    approved: 'requests.approve',
    rejected: 'requests.reject',
    archived: 'requests.archive',
  },
  approved: {
    completed: 'requests.archive',
    archived: 'requests.archive',
  },
  rejected: {
    archived: 'requests.archive',
  },
  completed: {
    archived: 'requests.archive',
  },
};

export function getStatusMeta(status: RequestStatus | string): StatusMeta {
  return REQUEST_STATUS_META[status as RequestStatus] || {
    label: status || 'غير محدد',
    shortLabel: status || 'غير محدد',
    tone: 'slate',
    description: 'حالة غير معرفة في النظام.',
  };
}

export function canTransitionRequest(
  role: UserRole | null | undefined,
  from: RequestStatus,
  to: RequestStatus
): boolean {
  if (from === to) return true;
  const requirement = TRANSITION_PERMISSIONS[from]?.[to];
  if (!requirement) return false;
  if (requirement === 'employee') return role === 'employee';
  return hasPermission(role, requirement);
}

export function isEmployeeEditableStatus(status: RequestStatus): boolean {
  return ['assigned', 'pending_employee_response', 'in_progress'].includes(status);
}

export function isSubmittedContentLocked(status: RequestStatus): boolean {
  return [
    'submitted_by_employee',
    'forwarded_to_principal',
    'returned',
    'approved',
    'rejected',
    'completed',
    'archived',
  ].includes(status);
}

export function isTerminalStatus(status: RequestStatus): boolean {
  return ['approved', 'rejected', 'completed', 'archived'].includes(status);
}

export function getAvailableTransitions(role: UserRole, status: RequestStatus): RequestStatus[] {
  const transitions = TRANSITION_PERMISSIONS[status] || {};
  return (Object.keys(transitions) as RequestStatus[]).filter(nextStatus =>
    canTransitionRequest(role, status, nextStatus)
  );
}

export function statusToneClasses(status: RequestStatus | string): string {
  const tone = getStatusMeta(status).tone;
  const classes: Record<StatusMeta['tone'], string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rose: 'bg-rose-100 text-rose-800 border-rose-200',
  };
  return classes[tone];
}
