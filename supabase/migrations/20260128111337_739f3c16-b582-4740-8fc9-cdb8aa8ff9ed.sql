-- Keep tasks.assigned_user_id in sync with task_assignments (primary assignee)

CREATE OR REPLACE FUNCTION public.sync_task_primary_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_primary uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If the task doesn't yet have a primary assignee, set it to the newly assigned user
    UPDATE public.tasks
    SET assigned_user_id = COALESCE(assigned_user_id, NEW.user_id)
    WHERE id = NEW.task_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- If the removed user was the primary assignee, pick the earliest remaining assignment (or NULL)
    SELECT ta.user_id
    INTO v_new_primary
    FROM public.task_assignments ta
    WHERE ta.task_id = OLD.task_id
    ORDER BY ta.created_at ASC
    LIMIT 1;

    UPDATE public.tasks
    SET assigned_user_id = CASE
      WHEN assigned_user_id = OLD.user_id THEN v_new_primary
      ELSE assigned_user_id
    END
    WHERE id = OLD.task_id;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS task_assignments_sync_primary ON public.task_assignments;
CREATE TRIGGER task_assignments_sync_primary
AFTER INSERT OR DELETE ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_primary_assignee();

-- One-time backfill for existing tasks that only used task_assignments
WITH first_assignment AS (
  SELECT DISTINCT ON (task_id)
    task_id,
    user_id
  FROM public.task_assignments
  ORDER BY task_id, created_at ASC
)
UPDATE public.tasks t
SET assigned_user_id = fa.user_id
FROM first_assignment fa
WHERE t.id = fa.task_id
  AND t.assigned_user_id IS NULL;
