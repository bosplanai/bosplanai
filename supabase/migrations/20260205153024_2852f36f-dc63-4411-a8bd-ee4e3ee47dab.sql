-- Create proper RLS policies for data_room_file_permissions table
-- Only the file uploader can insert/update/delete permissions for their files

-- Policy: File uploaders can insert permissions for their own files
CREATE POLICY "File uploaders can create permissions"
ON public.data_room_file_permissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM data_room_files 
    WHERE id = file_id AND uploaded_by = auth.uid()
  )
);

-- Policy: File uploaders can update permissions for their own files
CREATE POLICY "File uploaders can update permissions"
ON public.data_room_file_permissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM data_room_files 
    WHERE id = file_id AND uploaded_by = auth.uid()
  )
);

-- Policy: File uploaders can delete permissions for their own files
CREATE POLICY "File uploaders can delete permissions"
ON public.data_room_file_permissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM data_room_files 
    WHERE id = file_id AND uploaded_by = auth.uid()
  )
);

-- Policy: Users can view permissions for files they have access to
-- This allows:
-- 1. The file uploader to see permissions they created
-- 2. Users who have been granted permission to see their own permission record
CREATE POLICY "Users can view file permissions"
ON public.data_room_file_permissions
FOR SELECT
USING (
  -- User is the file uploader
  EXISTS (
    SELECT 1 FROM data_room_files 
    WHERE id = file_id AND uploaded_by = auth.uid()
  )
  OR
  -- User has been granted permission
  user_id = auth.uid()
);