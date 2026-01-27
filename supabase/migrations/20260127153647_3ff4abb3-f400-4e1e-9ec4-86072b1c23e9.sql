-- Create a dedicated private bucket for personal checklist attachments (scoped per-user)
-- This avoids conflicting with organization-scoped policies in the existing task-attachments bucket.

-- 1) Bucket
INSERT INTO storage.buckets (id, name, public)
SELECT 'personal-checklist-attachments', 'personal-checklist-attachments', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'personal-checklist-attachments'
);

-- 2) RLS policies on storage.objects (bucket-scoped)
-- NOTE: We only create policies; we do not modify storage schema objects.

DROP POLICY IF EXISTS "Users can upload personal checklist attachments" ON storage.objects;
CREATE POLICY "Users can upload personal checklist attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'personal-checklist-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view personal checklist attachments" ON storage.objects;
CREATE POLICY "Users can view personal checklist attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'personal-checklist-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update personal checklist attachments" ON storage.objects;
CREATE POLICY "Users can update personal checklist attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'personal-checklist-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete personal checklist attachments" ON storage.objects;
CREATE POLICY "Users can delete personal checklist attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'personal-checklist-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
