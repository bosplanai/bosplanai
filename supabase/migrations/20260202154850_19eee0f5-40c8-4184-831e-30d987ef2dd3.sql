-- Drop the old 2-parameter version of reassign_task to avoid ambiguity
DROP FUNCTION IF EXISTS public.reassign_task(uuid, uuid);

-- Ensure the 3-parameter version exists with the correct implementation
CREATE OR REPLACE FUNCTION public.reassign_task(p_task_id uuid, p_new_assignee_id uuid, p_reassignment_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_task record;
  v_is_super boolean;
  v_is_admin boolean;
  v_is_member boolean;
  v_is_moderator boolean;
  v_new_is_admin boolean;
BEGIN
  SELECT id, organization_id, category, assigned_user_id, created_by_user_id
  INTO v_task
  FROM public.tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = 'P0002';
  END IF;

  v_is_super := public.is_super_admin(auth.uid());
  v_is_admin := public.is_org_admin(auth.uid(), v_task.organization_id);
  v_is_member := public.is_org_member(auth.uid(), v_task.organization_id);

  v_is_moderator := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = v_task.organization_id
      AND ur.role = 'moderator'::public.app_role
  );

  IF NOT (v_is_super OR v_is_member) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Match existing app permissions:
  -- - super admins: always
  -- - org admins: always
  -- - product tasks: creator, current assignee, or moderator (when creator/assignee)
  IF NOT (
    v_is_super
    OR v_is_admin
    OR (
      v_task.category = 'product'::text
      AND (
        v_task.created_by_user_id = auth.uid()
        OR v_task.assigned_user_id = auth.uid()
        OR (v_is_moderator AND (v_task.created_by_user_id = auth.uid() OR v_task.assigned_user_id = auth.uid()))
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to reassign this task' USING ERRCODE = '42501';
  END IF;

  -- Ensure the new assignee belongs to the same organization
  IF NOT public.is_org_member(p_new_assignee_id, v_task.organization_id) THEN
    RAISE EXCEPTION 'New assignee must be a member of the organization' USING ERRCODE = '23514';
  END IF;

  -- Match DB rule: non-admins cannot assign tasks to admins
  v_new_is_admin := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_new_assignee_id
      AND ur.organization_id = v_task.organization_id
      AND ur.role = 'admin'::public.app_role
  );

  IF (NOT v_is_admin) AND v_new_is_admin THEN
    RAISE EXCEPTION 'Only admins can assign tasks to admins' USING ERRCODE = '42501';
  END IF;

  UPDATE public.tasks
  SET
    assigned_user_id = p_new_assignee_id,
    assignment_status = 'pending',
    decline_reason = NULL,
    last_reminder_sent_at = NULL,
    reassignment_reason = p_reassignment_reason
  WHERE id = p_task_id;
END;
$function$;