-- Drop the existing profiles SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

-- Create a new policy that allows viewing profiles of users who share any organization
-- This checks if the profile's user_id exists in user_roles for any organization the current user is a member of
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  -- User can always view their own profile
  id = auth.uid()
  OR
  -- User can view profiles of anyone in any organization they belong to
  id IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_roles ur2 
      WHERE ur2.user_id = auth.uid()
    )
  )
  OR
  -- Legacy: allow viewing profiles that uploaded files to shared orgs
  id IN (
    SELECT DISTINCT df.uploaded_by
    FROM drive_files df
    WHERE df.organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  )
);