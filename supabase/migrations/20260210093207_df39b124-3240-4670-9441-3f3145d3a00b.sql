
-- Update RLS policy so moderators can also update tasks assigned to them (any category)
-- This fixes the case where operational/strategic tasks appear on their Product board
-- but they can't change status because the old policy restricted to category='product' only

DROP POLICY IF EXISTS "Role-based task updates" ON public.tasks;

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
      -- Moderators can also update tasks assigned to them (any category)
      OR (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'moderator'::app_role
        )
        AND assigned_user_id = auth.uid()
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
  OR assigned_user_id = auth.uid()
);
