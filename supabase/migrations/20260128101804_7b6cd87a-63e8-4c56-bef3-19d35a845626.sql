-- Drop existing SELECT policy for tasks
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON public.tasks;

-- Create new SELECT policy that restricts Team (user role) to only their assigned tasks
-- Admin and Moderator can see all tasks, User role can only see assigned tasks
CREATE POLICY "Users can view tasks in their organization"
ON public.tasks
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  AND (
    -- Admins and Moderators can see all org tasks
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = tasks.organization_id
        AND user_roles.role IN ('admin', 'moderator')
    )
    OR
    -- Team members (user role) can only see tasks assigned to them
    assigned_user_id = auth.uid()
    OR
    -- Or tasks they created
    created_by_user_id = auth.uid()
    OR
    user_id = auth.uid()
  )
);