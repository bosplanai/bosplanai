-- Add RLS policy for super admins to view all organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to update all organizations (for suspend/reactivate)
CREATE POLICY "Super admins can update all organizations"
ON public.organizations
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all user roles
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all projects (for usage stats)
CREATE POLICY "Super admins can view all projects"
ON public.projects
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all tasks (for usage stats)
CREATE POLICY "Super admins can view all tasks"
ON public.tasks
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all drive files (for usage stats)
CREATE POLICY "Super admins can view all drive files"
ON public.drive_files
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all invoices (for usage stats)
CREATE POLICY "Super admins can view all invoices"
ON public.invoices
FOR SELECT
USING (public.is_super_admin(auth.uid()));