-- Drop the existing policy
DROP POLICY IF EXISTS "Role-based task updates" ON public.tasks;

-- Create updated policy that allows assignees to reassign tasks
-- The USING clause checks the user can access the row (current state)
-- The WITH CHECK clause validates the new row state
CREATE POLICY "Role-based task updates"
ON public.tasks
FOR UPDATE
USING (
  is_super_admin(auth.uid()) OR
  (
    is_org_member(auth.uid(), organization_id) AND
    (
      -- Admins can update any task in their org
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id = tasks.organization_id
        AND ur.role = 'admin'
      )
      OR
      -- Moderators can update product tasks they created or are assigned to
      (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'moderator'
        )
        AND category = 'product'
        AND (created_by_user_id = auth.uid() OR assigned_user_id = auth.uid())
      )
      OR
      -- Regular users can update product tasks assigned to them
      (category = 'product' AND assigned_user_id = auth.uid())
    )
  )
)
WITH CHECK (
  is_super_admin(auth.uid()) OR
  (
    is_org_member(auth.uid(), organization_id) AND
    (
      -- Admins can set any values
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id = tasks.organization_id
        AND ur.role = 'admin'
      )
      OR
      -- Moderators can update product tasks (allowing reassignment)
      (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'moderator'
        )
        AND category = 'product'
      )
      OR
      -- Regular users can update product tasks (allowing reassignment)
      -- They passed the USING check, so they were the assignee
      (category = 'product')
    )
  )
);