-- Drop the existing restrictive policy for data room file uploads
DROP POLICY IF EXISTS "Users can upload data room files to their organization" ON storage.objects;

-- Create a new policy that allows:
-- 1. Users with a role in the organization (via user_roles)
-- 2. Users who are members of a data room in that organization (via data_room_members)
CREATE POLICY "Users can upload data room files to their organization"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'data-room-files'
  AND (
    -- Allow if user has a role in the organization
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id::text = (storage.foldername(name))[1]
    )
    OR
    -- Allow if user is a member of any data room in that organization
    EXISTS (
      SELECT 1 FROM public.data_room_members drm
      JOIN public.data_rooms dr ON dr.id = drm.data_room_id
      WHERE drm.user_id = auth.uid()
      AND dr.organization_id::text = (storage.foldername(name))[1]
    )
    OR
    -- Allow if user is the owner/creator of any data room in that organization
    EXISTS (
      SELECT 1 FROM public.data_rooms dr
      WHERE dr.created_by = auth.uid()
      AND dr.organization_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Also update the DELETE policy for data room files
DROP POLICY IF EXISTS "Users can delete data room files in their organization" ON storage.objects;

CREATE POLICY "Users can delete data room files in their organization"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'data-room-files'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.organization_id::text = (storage.foldername(name))[1]
    )
    OR
    EXISTS (
      SELECT 1 FROM public.data_room_members drm
      JOIN public.data_rooms dr ON dr.id = drm.data_room_id
      WHERE drm.user_id = auth.uid()
      AND dr.organization_id::text = (storage.foldername(name))[1]
    )
    OR
    EXISTS (
      SELECT 1 FROM public.data_rooms dr
      WHERE dr.created_by = auth.uid()
      AND dr.organization_id::text = (storage.foldername(name))[1]
    )
  )
);