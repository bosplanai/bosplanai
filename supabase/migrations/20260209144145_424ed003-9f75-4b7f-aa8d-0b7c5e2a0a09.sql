
-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Role-based task updates" ON public.tasks;

-- Create a new UPDATE policy that allows:
-- 1. Super admins: can update any task
-- 2. Admins: can update any task in their org
-- 3. Moderators (Managers): can update ALL product category tasks in their org
-- 4. Regular users (Team): can update tasks assigned to them (product category only)
CREATE POLICY "Role-based task updates" ON public.tasks
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR (
    is_org_member(auth.uid(), organization_id)
    AND (
      -- Admins can update all tasks
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id = tasks.organization_id
        AND ur.role = 'admin'::app_role
      )
      -- Moderators can update ALL product category tasks
      OR (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'moderator'::app_role
        )
        AND category = 'product'
      )
      -- Regular users can update tasks assigned to them in product category
      OR (
        category = 'product'
        AND assigned_user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = tasks.organization_id
    AND ur.role = 'admin'::app_role
  )
  OR category = 'product'
);
