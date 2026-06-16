-- Lock teacher-submitted request content after the first submission.
--
-- After a public form moves to submitted_by_employee, the employee-facing
-- content becomes immutable: text response, uploaded attachments, signature,
-- selected template data, and generated final PDF URL cannot be replaced.
-- Administrative workflow fields such as status, rejection_reason, audit_trail,
-- admin_notes, and admin_attachments remain editable by authorized roles.

ALTER TABLE public.hr_requests
  ADD COLUMN IF NOT EXISTS final_pdf_url text,
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS template_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS content_locked_at timestamptz;

UPDATE public.hr_requests
SET content_locked_at = COALESCE(updated_at, created_at, now())
WHERE status IN (
    'submitted_by_employee',
    'forwarded_to_principal',
    'returned',
    'approved',
    'rejected',
    'completed',
    'archived'
  )
  AND content_locked_at IS NULL;

CREATE OR REPLACE FUNCTION public.prevent_submitted_request_content_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  locked_statuses text[] := ARRAY[
    'submitted_by_employee',
    'forwarded_to_principal',
    'returned',
    'approved',
    'rejected',
    'completed',
    'archived'
  ];
  content_changed boolean;
BEGIN
  content_changed :=
    NEW.employee_name IS DISTINCT FROM OLD.employee_name
    OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
    OR NEW.department IS DISTINCT FROM OLD.department
    OR NEW.job_title IS DISTINCT FROM OLD.job_title
    OR NEW.phone IS DISTINCT FROM OLD.phone
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.request_type IS DISTINCT FROM OLD.request_type
    OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.justification IS DISTINCT FROM OLD.justification
    OR NEW.agreed_to_terms IS DISTINCT FROM OLD.agreed_to_terms
    OR NEW.signature_data IS DISTINCT FROM OLD.signature_data
    OR NEW.final_pdf_url IS DISTINCT FROM OLD.final_pdf_url
    OR NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.attachments::text IS DISTINCT FROM OLD.attachments::text
    OR NEW.template_data::text IS DISTINCT FROM OLD.template_data::text;

  IF OLD.content_locked_at IS NOT NULL OR OLD.status = ANY (locked_statuses) THEN
    NEW.content_locked_at := COALESCE(OLD.content_locked_at, NEW.content_locked_at, now());

    IF content_changed THEN
      RAISE EXCEPTION 'Submitted request content is locked and cannot be changed.'
        USING
          ERRCODE = '23514',
          HINT = 'Create a new request if the teacher-submitted content must be corrected.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status = ANY (locked_statuses) THEN
    NEW.content_locked_at := COALESCE(NEW.content_locked_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_submitted_request_content_changes ON public.hr_requests;

CREATE TRIGGER trg_prevent_submitted_request_content_changes
BEFORE UPDATE ON public.hr_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_submitted_request_content_changes();

COMMENT ON COLUMN public.hr_requests.content_locked_at IS
  'Timestamp when employee-submitted content became immutable.';

-- Tighten public request links: they can read their bearer-link request after
-- submission, but they can only update while the request is still pre-submit.
DROP POLICY IF EXISTS "Public links can read editable requests" ON public.hr_requests;
DROP POLICY IF EXISTS "Public links can submit editable requests" ON public.hr_requests;

CREATE POLICY "Public links can read editable requests"
ON public.hr_requests
FOR SELECT
TO anon, authenticated
USING (
  length(id) >= 20
  AND status IN (
    'assigned',
    'pending_employee_response',
    'in_progress',
    'submitted_by_employee',
    'forwarded_to_principal',
    'returned',
    'approved',
    'rejected',
    'completed',
    'archived'
  )
);

CREATE POLICY "Public links can submit editable requests"
ON public.hr_requests
FOR UPDATE
TO anon, authenticated
USING (
  length(id) >= 20
  AND status IN ('assigned', 'pending_employee_response', 'in_progress')
)
WITH CHECK (
  length(id) >= 20
  AND status = 'submitted_by_employee'
);
