-- Fix drive-files storage bucket policies to use user_roles instead of profiles
-- This ensures all org members (Team, Manager, Admin) can upload files

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view files in their organization folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their organization folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files in their organization folder" ON storage.objects;

-- Recreate with user_roles check (consistent with data-room-files bucket)
CREATE POLICY "Users can view files in their organization folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Users can upload files to their organization folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Users can update files in their organization folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Users can delete files in their organization folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);