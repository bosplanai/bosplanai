-- Fix multi-assignee task request visibility:
-- Current issue: tasks RLS only considers tasks.assigned_user_id (single primary) which can block
-- other assignees (via task_assignments) from seeing the task row, causing pending requests
-- to be filtered out client-side.
-- Additionally, task_assignments RLS referenced tasks, which can indirectly depend on tasks RLS.

-- Helper: can the current user access the task's organization by task id?
CREATE OR REPLACE FUNCTION public.can_access_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  );
$$;

-- Helper: is the current user an assignee of this task (any status) via task_assignments?
CREATE OR REPLACE FUNCTION public.is_task_assignee(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    WHERE ta.task_id = p_task_id
      AND ta.user_id = auth.uid()
  );
$$;

-- Rebuild task_assignments policies to avoid depending on tasks RLS
DROP POLICY IF EXISTS "Users can manage task assignments in their organization" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can view task assignments in their organization" ON public.task_assignments;

CREATE POLICY "Users can view task assignments in their organization"
ON public.task_assignments
FOR SELECT
USING (public.can_access_task(task_id));

CREATE POLICY "Users can create task assignments in their organization"
ON public.task_assignments
FOR INSERT
WITH CHECK (public.can_access_task(task_id));

CREATE POLICY "Users can update task assignments in their organization"
ON public.task_assignments
FOR UPDATE
USING (public.can_access_task(task_id))
WITH CHECK (public.can_access_task(task_id));

CREATE POLICY "Users can delete task assignments in their organization"
ON public.task_assignments
FOR DELETE
USING (public.can_access_task(task_id));

-- Update tasks visibility to include all assignees (not just tasks.assigned_user_id)
DROP POLICY IF EXISTS "Role-based task visibility" ON public.tasks;

CREATE POLICY "Role-based task visibility"
ON public.tasks
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.is_org_member(auth.uid(), organization_id)
    AND (
      -- Admins see all tasks in org
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = tasks.organization_id
          AND ur.role = 'admin'::public.app_role
      )
      -- Moderators see all product tasks
      OR (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.organization_id = tasks.organization_id
            AND ur.role = 'moderator'::public.app_role
        )
        AND category = 'product'::text
      )
      -- Any assignee (pending/accepted/declined) can see the task row (needed for task requests)
      OR public.is_task_assignee(id)
      -- Team visibility on product tasks they own/created/primary-assigned
      OR (
        category = 'product'::text
        AND (
          assigned_user_id = auth.uid()
          OR created_by_user_id = auth.uid()
          OR user_id = auth.uid()
        )
      )
    )
  )
);
