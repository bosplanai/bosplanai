-- Fix profiles RLS to allow viewing profiles of users who share ANY organization via user_roles
-- The current policy incorrectly checks profiles.organization_id instead of user_roles membership

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  -- User can always view their own profile
  id = auth.uid()
  OR
  -- User can view profiles of anyone in any organization they share membership in via user_roles
  id IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.organization_id IN (
      SELECT ur2.organization_id 
      FROM user_roles ur2 
      WHERE ur2.user_id = auth.uid()
    )
  )
);