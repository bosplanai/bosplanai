
-- Allow all Data Room participants to delete any file in the room
DROP POLICY IF EXISTS "Admins can delete files in their organization" ON public.data_room_files;

CREATE POLICY "Data room participants can delete files"
ON public.data_room_files
FOR DELETE
USING (
  is_org_admin(auth.uid(), organization_id)
  OR uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM data_room_members
    WHERE data_room_members.data_room_id = data_room_files.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM data_rooms
    WHERE data_rooms.id = data_room_files.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);
