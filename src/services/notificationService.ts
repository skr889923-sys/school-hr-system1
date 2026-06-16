import { supabase } from '../supabase';

export interface NotificationInput {
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  title: string;
  body: string;
  type: 'request_assigned' | 'request_submitted' | 'request_status' | 'system';
  entityType?: string;
  entityId?: string;
}

export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      recipient_user_id: input.recipientUserId || null,
      recipient_email: input.recipientEmail || null,
      title: input.title,
      body: input.body,
      type: input.type,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Notifications are optional until the migration is applied.
  }
}

export async function createRequestNotificationByEmail(input: Omit<NotificationInput, 'recipientUserId'>): Promise<void> {
  let recipientUserId: string | null = null;

  if (input.recipientEmail) {
    const { data } = await supabase
      .from('employees')
      .select('auth_user_id')
      .eq('email', input.recipientEmail)
      .maybeSingle();

    recipientUserId = data?.auth_user_id || null;
  }

  await createNotification({
    ...input,
    recipientUserId,
  });
}
