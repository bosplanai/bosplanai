-- Drop the problematic policy on drive_file_access that causes circular reference
DROP POLICY IF EXISTS "Users can view access grants for files they own or have access" ON public.drive_file_access;

-- Drop policies that depend on is_file_owner function first
DROP POLICY IF EXISTS "File owners can grant access" ON public.drive_file_access;
DROP POLICY IF EXISTS "File owners can revoke access" ON public.drive_file_access;

-- Now drop and recreate is_file_owner as a security definer function
DROP FUNCTION IF EXISTS public.is_file_owner(uuid, uuid);

CREATE OR REPLACE FUNCTION public.is_file_owner(_file_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM drive_files 
    WHERE id = _file_id AND uploaded_by = _user_id
  );
$$;

-- Recreate the policies using the new security definer function
CREATE POLICY "File owners can grant access" ON public.drive_file_access
FOR INSERT
WITH CHECK (is_file_owner(file_id, auth.uid()));

CREATE POLICY "File owners can revoke access" ON public.drive_file_access
FOR DELETE
USING (is_file_owner(file_id, auth.uid()));