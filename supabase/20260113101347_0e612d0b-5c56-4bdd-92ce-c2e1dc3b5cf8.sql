-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

-- Create a new policy that also allows viewing profiles of users who uploaded files to organizations you belong to
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (
  -- Can view own profile
  (id = auth.uid()) 
  OR 
  -- Can view profiles of users in same organization
  (organization_id IN (
    SELECT ur.organization_id
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  ))
  OR
  -- Can view profiles of users who uploaded files to organizations you belong to
  (id IN (
    SELECT DISTINCT df.uploaded_by
    FROM drive_files df
    WHERE df.organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  ))
);