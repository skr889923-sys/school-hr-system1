-- School HR System platform upgrade
-- Safe, additive migration. No existing data is dropped.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT e.role
      FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND COALESCE(e.active, true) = true
      LIMIT 1
    ),
    (
      SELECT u.role
      FROM public.users u
      WHERE u.uid = auth.uid()
      LIMIT 1
    ),
    'employee'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_app_role() TO anon, authenticated;

ALTER TABLE public.hr_templates
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.hr_requests
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by_role text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS template_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audit_trail jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  entity_type text,
  entity_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_hr_requests_status ON public.hr_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_requests_email ON public.hr_requests(email);
CREATE INDEX IF NOT EXISTS idx_hr_requests_template_id ON public.hr_requests(template_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_created_at ON public.hr_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_requests_assigned_to ON public.hr_requests(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_created_by ON public.hr_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON public.notifications(recipient_email, is_read, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'Admins can read audit logs'
  ) THEN
    CREATE POLICY "Admins can read audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (public.current_app_role() IN ('principal', 'hr_manager', 'it_support'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'Authenticated users can write audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can write audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
    ON public.notifications
    FOR SELECT
    USING (
      recipient_user_id = auth.uid()
      OR recipient_email = (auth.jwt() ->> 'email')
      OR public.current_app_role() IN ('principal', 'hr_manager', 'it_support')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admins can create notifications'
  ) THEN
    CREATE POLICY "Admins can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND public.current_app_role() IN ('principal', 'hr_manager', 'it_support', 'employee')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can mark own notifications read'
  ) THEN
    CREATE POLICY "Users can mark own notifications read"
    ON public.notifications
    FOR UPDATE
    USING (
      recipient_user_id = auth.uid()
      OR recipient_email = (auth.jwt() ->> 'email')
    )
    WITH CHECK (
      recipient_user_id = auth.uid()
      OR recipient_email = (auth.jwt() ->> 'email')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Principals and supervisors can insert employees'
  ) THEN
    CREATE POLICY "Principals and supervisors can insert employees"
    ON public.employees
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND public.current_app_role() IN ('principal', 'hr_manager')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Principals and supervisors can update employees'
  ) THEN
    CREATE POLICY "Principals and supervisors can update employees"
    ON public.employees
    FOR UPDATE
    USING (
      auth.uid() IS NOT NULL
      AND public.current_app_role() IN ('principal', 'hr_manager')
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND public.current_app_role() IN ('principal', 'hr_manager')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Admins can read employees'
  ) THEN
    CREATE POLICY "Admins can read employees"
    ON public.employees
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND (
        auth_user_id = auth.uid()
        OR public.current_app_role() IN ('principal', 'hr_manager', 'it_support')
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_requests' AND policyname = 'Admins can read all requests'
  ) THEN
    CREATE POLICY "Admins can read all requests"
    ON public.hr_requests
    FOR SELECT
    USING (public.current_app_role() IN ('principal', 'hr_manager', 'it_support'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_requests' AND policyname = 'Employees can read assigned requests'
  ) THEN
    CREATE POLICY "Employees can read assigned requests"
    ON public.hr_requests
    FOR SELECT
    USING (
      assigned_to_user_id = auth.uid()
      OR email = (auth.jwt() ->> 'email')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_requests' AND policyname = 'Supervisors can create requests'
  ) THEN
    CREATE POLICY "Supervisors can create requests"
    ON public.hr_requests
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND public.current_app_role() IN ('hr_manager')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_requests' AND policyname = 'Authorized users can update requests'
  ) THEN
    CREATE POLICY "Authorized users can update requests"
    ON public.hr_requests
    FOR UPDATE
    USING (
      public.current_app_role() IN ('principal', 'hr_manager', 'it_support')
      OR email = (auth.jwt() ->> 'email')
      OR assigned_to_user_id = auth.uid()
    )
    WITH CHECK (
      public.current_app_role() IN ('principal', 'hr_manager', 'it_support')
      OR email = (auth.jwt() ->> 'email')
      OR assigned_to_user_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_templates' AND policyname = 'Authenticated users can read active templates'
  ) THEN
    CREATE POLICY "Authenticated users can read active templates"
    ON public.hr_templates
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND (active = true OR public.current_app_role() IN ('hr_manager', 'it_support'))
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_templates' AND policyname = 'Support and supervisors can manage templates'
  ) THEN
    CREATE POLICY "Support and supervisors can manage templates"
    ON public.hr_templates
    FOR ALL
    USING (public.current_app_role() IN ('hr_manager', 'it_support'))
    WITH CHECK (public.current_app_role() IN ('hr_manager', 'it_support'));
  END IF;
END $$;

COMMENT ON TABLE public.audit_logs IS 'Central audit log for sensitive HR operations.';
COMMENT ON TABLE public.notifications IS 'Internal notifications, extendable later to email, SMS, or WhatsApp.';
COMMENT ON COLUMN public.employees.signature_data IS 'Electronic signature inside the system with audit context; not a certified digital signature.';
