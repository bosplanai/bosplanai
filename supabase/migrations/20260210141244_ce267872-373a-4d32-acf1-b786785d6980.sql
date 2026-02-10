-- Allow all data room members to update files (status, assignment, etc.)
DROP POLICY IF EXISTS "Admins, uploader or assignee can update files" ON public.data_room_files;

CREATE POLICY "Data room participants can update files"
ON public.data_room_files
FOR UPDATE
USING (
  -- Org admins
  is_org_admin(auth.uid(), organization_id)
  -- File uploader
  OR uploaded_by = auth.uid()
  -- Assigned user
  OR assigned_to = auth.uid()
  -- Data room members
  OR EXISTS (
    SELECT 1 FROM data_room_members
    WHERE data_room_members.data_room_id = data_room_files.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  -- Data room creator
  OR EXISTS (
    SELECT 1 FROM data_rooms
    WHERE data_rooms.id = data_room_files.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);