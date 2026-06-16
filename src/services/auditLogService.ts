import { supabase } from '../supabase';
import { AuditLogEntry, UserRole } from '../types';
import { getRoleLabel } from './rbac';

interface AuditInput {
  action: string;
  details: string;
  performedByRole: UserRole;
  performedByName?: string;
}

interface PersistAuditInput extends AuditInput {
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function createAuditEntry(input: AuditInput): AuditLogEntry {
  return {
    id: createId(),
    action: input.action,
    details: input.details,
    performedByRole: input.performedByRole,
    performedByName: input.performedByName || getRoleLabel(input.performedByRole),
    timestamp: new Date().toISOString(),
  };
}

export async function persistAuditLog(input: PersistAuditInput): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  await supabase.from('audit_logs').insert({
    user_id: user?.id || null,
    user_email: user?.email || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    old_value: input.oldValue || null,
    new_value: input.newValue || null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    created_at: new Date().toISOString(),
  });
}

export async function appendRequestAudit(
  currentTrail: AuditLogEntry[] | undefined,
  input: PersistAuditInput
): Promise<AuditLogEntry[]> {
  const entry = createAuditEntry(input);
  const nextTrail = [...(currentTrail || []), entry];

  try {
    await persistAuditLog(input);
  } catch {
    // The embedded request audit trail remains the compatibility fallback
    // when the optional audit_logs migration has not been applied yet.
  }

  return nextTrail;
}
