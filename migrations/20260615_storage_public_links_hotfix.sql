-- Storage hotfix for public teacher request links.
-- Public form links upload final PDFs and attachments under:
-- files/requests/HR-YYYYMMDD-XXXXXXXXXXXX/<file>
--
-- The previous policy only targeted anon. Browsers can still carry an
-- authenticated Supabase session while opening a public link, so this migration
-- permits both anon and authenticated roles for HR public-link paths.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  true,
  26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public HR links can upload request files v2'
  ) THEN
    CREATE POLICY "Public HR links can upload request files v2"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      bucket_id = 'files'
      AND split_part(name, '/', 1) = 'requests'
      AND lower(split_part(name, '/', 2)) LIKE 'hr-%'
      AND length(split_part(name, '/', 2)) >= 20
      AND split_part(name, '/', 3) <> ''
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public HR links can read request files v2'
  ) THEN
    CREATE POLICY "Public HR links can read request files v2"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (
      bucket_id = 'files'
      AND split_part(name, '/', 1) = 'requests'
      AND lower(split_part(name, '/', 2)) LIKE 'hr-%'
      AND length(split_part(name, '/', 2)) >= 20
      AND split_part(name, '/', 3) <> ''
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload managed files v2'
  ) THEN
    CREATE POLICY "Authenticated users can upload managed files v2"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'files'
      AND split_part(name, '/', 1) = 'requests'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can read managed files v2'
  ) THEN
    CREATE POLICY "Authenticated users can read managed files v2"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete managed files v2'
  ) THEN
    CREATE POLICY "Authenticated users can delete managed files v2"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'files'
      AND split_part(name, '/', 1) = 'requests'
    );
  END IF;
END $$;
