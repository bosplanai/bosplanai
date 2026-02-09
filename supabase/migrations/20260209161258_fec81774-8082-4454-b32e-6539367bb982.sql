-- Update data_room_files UPDATE policy to allow assignees to update file status
DROP POLICY IF EXISTS "Admins or uploader can update files" ON public.data_room_files;

CREATE POLICY "Admins, uploader or assignee can update files"
ON public.data_room_files
FOR UPDATE
USING (
  is_org_admin(auth.uid(), organization_id) 
  OR uploaded_by = auth.uid()
  OR assigned_to = auth.uid()
);