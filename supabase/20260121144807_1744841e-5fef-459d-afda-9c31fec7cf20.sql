-- Update RLS policies for data_room_document_versions to include file-level permission checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view data room document versions" ON public.data_room_document_versions;
DROP POLICY IF EXISTS "Users can create data room document versions" ON public.data_room_document_versions;

-- Create updated SELECT policy that also checks file permissions
CREATE POLICY "Users can view data room document versions"
ON public.data_room_document_versions
FOR SELECT
USING (
  -- Room members can view
  EXISTS (
    SELECT 1 FROM data_room_members
    WHERE data_room_members.data_room_id = data_room_document_versions.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR
  -- Room creator can view
  EXISTS (
    SELECT 1 FROM data_rooms
    WHERE data_rooms.id = data_room_document_versions.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
  OR
  -- Users with file-level view or edit permission can view
  EXISTS (
    SELECT 1 FROM data_room_file_permissions
    WHERE data_room_file_permissions.file_id = data_room_document_versions.file_id
    AND data_room_file_permissions.user_id = auth.uid()
    AND data_room_file_permissions.permission_level IN ('view', 'edit')
  )
);

-- Create updated INSERT policy that also checks file permissions
CREATE POLICY "Users can create data room document versions"
ON public.data_room_document_versions
FOR INSERT
WITH CHECK (
  -- Room members can create
  EXISTS (
    SELECT 1 FROM data_room_members
    WHERE data_room_members.data_room_id = data_room_document_versions.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR
  -- Room creator can create
  EXISTS (
    SELECT 1 FROM data_rooms
    WHERE data_rooms.id = data_room_document_versions.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
  OR
  -- Users with file-level edit permission can create versions
  EXISTS (
    SELECT 1 FROM data_room_file_permissions
    WHERE data_room_file_permissions.file_id = data_room_document_versions.file_id
    AND data_room_file_permissions.user_id = auth.uid()
    AND data_room_file_permissions.permission_level = 'edit'
  )
);