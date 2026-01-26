-- Fix infinite recursion: drive_files SELECT policy references drive_file_access;
-- drive_file_access SELECT policy must NOT reference drive_files.

DROP POLICY IF EXISTS "Users can view access grants" ON public.drive_file_access;

CREATE POLICY "Users can view access grants"
ON public.drive_file_access
FOR SELECT
USING (
  granted_by = auth.uid()
  OR granted_to = auth.uid()
);
