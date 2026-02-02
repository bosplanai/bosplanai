-- Add reassignment_reason column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reassignment_reason TEXT;

-- Update the reassign_task function to accept and store the reason
CREATE OR REPLACE FUNCTION public.reassign_task(p_task_id uuid, p_new_assignee_id uuid, p_reassignment_reason text DEFAULT NULL)
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

-- Update the notify_task_reassigned trigger to include the reassignment reason
CREATE OR REPLACE FUNCTION public.notify_task_reassigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  previous_assignee_name text;
  new_assignee_name text;
  notification_message text;
BEGIN
  -- Only handle true reassignments (not first assignment/unassignment)
  IF OLD.assigned_user_id IS NULL OR NEW.assigned_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify when the task is (re)sent as a request
  IF NEW.assignment_status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get names
  SELECT full_name INTO previous_assignee_name
  FROM public.profiles
  WHERE id = OLD.assigned_user_id;

  SELECT full_name INTO new_assignee_name
  FROM public.profiles
  WHERE id = NEW.assigned_user_id;

  previous_assignee_name := COALESCE(previous_assignee_name, 'A team member');
  new_assignee_name := COALESCE(new_assignee_name, 'another team member');

  -- Build notification message with optional reason
  notification_message := previous_assignee_name || ' reassigned "' || COALESCE(NEW.title, 'Untitled') || '" to ' || new_assignee_name || '.';
  IF NEW.reassignment_reason IS NOT NULL AND NEW.reassignment_reason != '' THEN
    notification_message := notification_message || ' Reason: ' || NEW.reassignment_reason;
  END IF;

  -- Notify creator (if present)
  IF NEW.created_by_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
    VALUES (
      NEW.created_by_user_id,
      NEW.organization_id,
      'task_reassigned',
      'Task Reassigned',
      notification_message,
      NEW.id,
      'task'
    );
  END IF;

  -- Notify new assignee
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.assigned_user_id,
    NEW.organization_id,
    'task_request',
    'Task Reassigned to You',
    previous_assignee_name || ' has reassigned "' || COALESCE(NEW.title, 'Untitled') || '" to you.' || 
    CASE WHEN NEW.reassignment_reason IS NOT NULL AND NEW.reassignment_reason != '' 
      THEN ' Reason: ' || NEW.reassignment_reason 
      ELSE '' 
    END,
    NEW.id,
    'task'
  );

  RETURN NEW;
END;
$function$;