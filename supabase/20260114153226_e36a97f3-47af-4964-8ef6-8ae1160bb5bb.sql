-- Allow organization_id to be null for super_admin roles
ALTER TABLE public.user_roles ALTER COLUMN organization_id DROP NOT NULL;

-- Add a check constraint to ensure organization_id is only null for super_admin
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_org_required_for_non_superadmin
  CHECK (role = 'super_admin' OR organization_id IS NOT NULL);