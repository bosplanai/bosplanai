-- Fix Role-based task visibility to allow managers (moderators) to see ALL product management tasks
DROP POLICY IF EXISTS "Role-based task visibility" ON public.tasks;

CREATE POLICY "Role-based task visibility" ON public.tasks
FOR SELECT USING (
  is_super_admin(auth.uid())
  OR (
    is_org_member(auth.uid(), organization_id)
    AND (
      -- Admins can see all tasks
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id = tasks.organization_id
        AND ur.role = 'admin'
      )
      -- Moderators (Managers) can see ALL product management tasks
      OR (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'moderator'
        )
        AND category = 'product'
      )
      -- Team users (viewers) can only see product tasks assigned to them, created by them, or owned by them
      OR (
        category = 'product'
        AND (
          assigned_user_id = auth.uid()
          OR created_by_user_id = auth.uid()
          OR user_id = auth.uid()
        )
      )
    )
  )
);