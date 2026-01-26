-- Drop and recreate the super admin update policy with proper WITH CHECK clause
DROP POLICY IF EXISTS "Super admins can update all organizations" ON public.organizations;

CREATE POLICY "Super admins can update all organizations"
ON public.organizations
FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));