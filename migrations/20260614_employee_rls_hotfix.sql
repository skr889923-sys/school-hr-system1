-- Hotfix for employees RLS.
-- Run this after the platform upgrade migration if adding employees fails with:
-- "new row violates row-level security policy for table employees".

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employees'
      AND policyname = 'Principals and supervisors can insert employees'
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
    WHERE schemaname = 'public'
      AND tablename = 'employees'
      AND policyname = 'Principals and supervisors can update employees'
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
    WHERE schemaname = 'public'
      AND tablename = 'employees'
      AND policyname = 'Admins can read employees'
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
END $$;

-- Bootstrap note:
-- The currently signed-in admin must already be represented in public.employees
-- with auth_user_id = their auth.users.id and role in ('principal', 'hr_manager'),
-- or in public.users with uid = their auth.users.id and role in ('principal', 'hr_manager').
