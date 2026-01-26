-- Drop the existing upload policy for data room files
DROP POLICY IF EXISTS "Users can upload data room files to their organization" ON storage.objects;

-- Create a new policy that checks user_roles instead of profiles.organization_id
-- This allows users to upload to any organization they are a member of
CREATE POLICY "Users can upload data room files to their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'data-room-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Also fix the SELECT policy if it has the same issue
DROP POLICY IF EXISTS "Users can view data room files in their organization" ON storage.objects;

CREATE POLICY "Users can view data room files in their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'data-room-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Fix the UPDATE policy
DROP POLICY IF EXISTS "Users can update data room files in their organization" ON storage.objects;

CREATE POLICY "Users can update data room files in their organization"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'data-room-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Fix the DELETE policies (there are two redundant ones)
DROP POLICY IF EXISTS "Users can delete data room files in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in bucket" ON storage.objects;

CREATE POLICY "Users can delete data room files in their organization"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'data-room-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);