
-- Update task_merge_logs RLS policies to allow moderators (Managers) to insert, update, and use Magic Merge

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can insert merge logs" ON public.task_merge_logs;
DROP POLICY IF EXISTS "Admins can update merge logs" ON public.task_merge_logs;

-- Create new INSERT policy: admins and moderators can insert merge logs
CREATE POLICY "Admins and moderators can insert merge logs"
ON public.task_merge_logs
FOR INSERT
WITH CHECK (
  is_org_admin(auth.uid(), organization_id)
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = task_merge_logs.organization_id
    AND ur.role = 'moderator'::app_role
  )
);

-- Create new UPDATE policy: admins and moderators can update merge logs (for reverts)
CREATE POLICY "Admins and moderators can update merge logs"
ON public.task_merge_logs
FOR UPDATE
USING (
  is_org_admin(auth.uid(), organization_id)
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = task_merge_logs.organization_id
    AND ur.role = 'moderator'::app_role
  )
);
