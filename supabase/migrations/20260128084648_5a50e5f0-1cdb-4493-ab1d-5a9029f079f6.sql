-- Invite flow hardening: prevent duplicates and allow org admins to manage roles safely

-- 1) Prevent duplicate memberships per organization
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_user_org
ON public.user_roles (user_id, organization_id)
WHERE organization_id IS NOT NULL;

-- 2) Prevent duplicate pending invites per org+email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_unique_pending
ON public.organization_invites (organization_id, lower(email))
WHERE status = 'pending';

-- 3) Security definer helper for admin checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
  );
$$;

-- 4) Allow org admins to view/manage roles in their org (needed for Team Settings + role changes)
DROP POLICY IF EXISTS "Org admins can view roles in their organization" ON public.user_roles;
CREATE POLICY "Org admins can view roles in their organization"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can update roles in their organization" ON public.user_roles;
CREATE POLICY "Org admins can update roles in their organization"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can remove roles in their organization" ON public.user_roles;
CREATE POLICY "Org admins can remove roles in their organization"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.is_org_admin(auth.uid(), organization_id)
  AND user_id <> auth.uid()
);
