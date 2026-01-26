-- Fix RLS on public.data_room_files to support users who belong to multiple organizations.
-- Previous policy used get_user_organization_id(auth.uid()) which only reads profiles.organization_id.

DROP POLICY IF EXISTS "Users can upload files to their organization" ON public.data_room_files;
CREATE POLICY "Users can upload files to their organization"
ON public.data_room_files
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can view files in their organization" ON public.data_room_files;
CREATE POLICY "Users can view files in their organization"
ON public.data_room_files
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
);
