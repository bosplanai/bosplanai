-- Drop existing policies on drive_file_access that cause recursion
DROP POLICY IF EXISTS "File owners can grant access" ON public.drive_file_access;
DROP POLICY IF EXISTS "File owners can revoke access" ON public.drive_file_access;
DROP POLICY IF EXISTS "Users can view access grants for files they own or have access" ON public.drive_file_access;

-- Create new policies that avoid recursion by using a direct query without triggering drive_files RLS
-- Use SECURITY DEFINER function to check file ownership without triggering RLS

CREATE OR REPLACE FUNCTION public.is_file_owner(_file_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM drive_files 
    WHERE id = _file_id AND uploaded_by = _user_id
  );
$$;

-- Recreate policies using the security definer function
CREATE POLICY "File owners can grant access"
ON public.drive_file_access
FOR INSERT
WITH CHECK (is_file_owner(file_id, auth.uid()));

CREATE POLICY "File owners can revoke access"
ON public.drive_file_access
FOR DELETE
USING (is_file_owner(file_id, auth.uid()));

CREATE POLICY "Users can view access grants"
ON public.drive_file_access
FOR SELECT
USING (
  granted_by = auth.uid() 
  OR granted_to = auth.uid() 
  OR is_file_owner(file_id, auth.uid())
);