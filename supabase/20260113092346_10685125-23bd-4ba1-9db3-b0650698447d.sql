-- Fix infinite recursion between drive_files and drive_file_access RLS policies
-- Root cause: drive_files SELECT policy references drive_file_access, and drive_file_access SELECT policy referenced drive_files.
-- Solution: replace drive_file_access SELECT policies with a single policy that uses security definer function is_file_owner().

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drive_file_access'
      AND cmd = 'SELECT'
      AND policyname LIKE 'Users can view access grants%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.drive_file_access;', r.policyname);
  END LOOP;
END $$;

-- Recreate a safe SELECT policy without referencing drive_files directly
CREATE POLICY "Users can view access grants" ON public.drive_file_access
FOR SELECT
USING (
  (granted_by = auth.uid())
  OR (granted_to = auth.uid())
  OR public.is_file_owner(file_id, auth.uid())
);
