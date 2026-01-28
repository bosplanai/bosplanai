-- Fix task reassignment still failing (RLS WITH CHECK)
-- Keep USING strict (must have access to the existing row), but relax WITH CHECK
-- so changing assigned_user_id doesn't violate RLS.

DROP POLICY IF EXISTS "Role-based task updates" ON public.tasks;

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
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'admin'::public.app_role
      )
      OR
      -- Managers (moderator) can update product tasks they created or are assigned to
      (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.organization_id = tasks.organization_id
            AND ur.role = 'moderator'::public.app_role
        )
        AND category = 'product'::text
        AND (created_by_user_id = auth.uid() OR assigned_user_id = auth.uid())
      )
      OR
      -- Team (user) can update product tasks assigned to them
      (category = 'product'::text AND assigned_user_id = auth.uid())
    )
  )
)
WITH CHECK (
  -- NOTE: WITH CHECK is evaluated on the *new* row, so it must not require
  -- assigned_user_id = auth.uid() (reassignment changes the assignee).
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = tasks.organization_id
      AND ur.role = 'admin'::public.app_role
  )
  OR (category = 'product'::text)
);
