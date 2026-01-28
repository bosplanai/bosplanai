-- Add policy to allow all org members to view roles in their organization
-- This enables managers to see team members for task assignment
CREATE POLICY "Org members can view roles in their organization"
ON public.user_roles
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
);