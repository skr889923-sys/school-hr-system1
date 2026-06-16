-- Public request links for teachers.
-- This supports /request/:id without requiring the teacher to sign in.
-- Security model: only new long, random request IDs are public-link capable.

ALTER TABLE public.hr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hr_templates
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_requests'
      AND policyname = 'Public links can read editable requests'
  ) THEN
    CREATE POLICY "Public links can read editable requests"
    ON public.hr_requests
    FOR SELECT
    TO anon
    USING (
      length(id) >= 20
      AND status IN ('assigned', 'pending_employee_response', 'in_progress', 'returned')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_requests'
      AND policyname = 'Public links can submit editable requests'
  ) THEN
    CREATE POLICY "Public links can submit editable requests"
    ON public.hr_requests
    FOR UPDATE
    TO anon
    USING (
      length(id) >= 20
      AND status IN ('assigned', 'pending_employee_response', 'in_progress', 'returned')
    )
    WITH CHECK (
      length(id) >= 20
      AND status = 'submitted_by_employee'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_templates'
      AND policyname = 'Public links can read active templates'
  ) THEN
    CREATE POLICY "Public links can read active templates"
    ON public.hr_templates
    FOR SELECT
    TO anon
    USING (active = true);
  END IF;
END $$;

-- Optional storage policies for public request attachments.
-- They assume the Supabase Storage bucket name is "files".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public request links can upload files'
  ) THEN
    CREATE POLICY "Public request links can upload files"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
      bucket_id = 'files'
      AND (storage.foldername(name))[1] = 'requests'
      AND length((storage.foldername(name))[2]) >= 20
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public request links can read files'
  ) THEN
    CREATE POLICY "Public request links can read files"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (
      bucket_id = 'files'
      AND (storage.foldername(name))[1] = 'requests'
      AND length((storage.foldername(name))[2]) >= 20
    );
  END IF;
END $$;
