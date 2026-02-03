-- Fix the permissive presence SELECT policy to be more restrictive
DROP POLICY IF EXISTS "Users can view document presence" ON public.data_room_document_presence;

CREATE POLICY "Users can view document presence"
ON public.data_room_document_presence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM data_room_files f
    JOIN user_roles ur ON ur.organization_id = f.organization_id
    WHERE f.id = data_room_document_presence.file_id
    AND ur.user_id = auth.uid()
  )
);