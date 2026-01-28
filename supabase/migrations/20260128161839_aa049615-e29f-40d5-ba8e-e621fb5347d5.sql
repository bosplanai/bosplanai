-- 1) Fix overly-permissive notifications INSERT policy (was WITH CHECK (true))
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_org_member(auth.uid(), organization_id)
);

-- 2) Add server-side notifications for task reassignment (so the client doesn't need to insert notifications)
CREATE OR REPLACE FUNCTION public.notify_task_reassigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_assignee_name text;
  new_assignee_name text;
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

  -- Notify creator (if present)
  IF NEW.created_by_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
    VALUES (
      NEW.created_by_user_id,
      NEW.organization_id,
      'task_reassigned',
      'Task Reassigned',
      previous_assignee_name || ' reassigned "' || COALESCE(NEW.title, 'Untitled') || '" to ' || new_assignee_name || '.',
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
    previous_assignee_name || ' has reassigned "' || COALESCE(NEW.title, 'Untitled') || '" to you.',
    NEW.id,
    'task'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_reassigned ON public.tasks;

CREATE TRIGGER on_task_reassigned
AFTER UPDATE ON public.tasks
FOR EACH ROW
WHEN (old.assigned_user_id IS DISTINCT FROM new.assigned_user_id)
EXECUTE FUNCTION public.notify_task_reassigned();
