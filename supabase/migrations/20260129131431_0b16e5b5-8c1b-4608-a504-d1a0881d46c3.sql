-- Fix org creation: allow users to have the same role across multiple organizations
-- The app uses org-scoped roles (user_id + organization_id), so we must NOT enforce UNIQUE(user_id, role).

-- 1) Drop the incorrect unique constraint/index
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

DROP INDEX IF EXISTS public.user_roles_user_id_role_key;

-- 2) Ensure we still prevent duplicate membership rows per org
-- (This already exists in most environments; keep it here for safety.)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_user_org
ON public.user_roles (user_id, organization_id)
WHERE organization_id IS NOT NULL;

-- 3) Fix security linter: enable RLS on guest_auth_attempts (public schema table)
ALTER TABLE public.guest_auth_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert guest auth attempts" ON public.guest_auth_attempts;
CREATE POLICY "Anyone can insert guest auth attempts"
ON public.guest_auth_attempts
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view guest auth attempts" ON public.guest_auth_attempts;
CREATE POLICY "Super admins can view guest auth attempts"
ON public.guest_auth_attempts
FOR SELECT
USING (is_super_admin(auth.uid()));
