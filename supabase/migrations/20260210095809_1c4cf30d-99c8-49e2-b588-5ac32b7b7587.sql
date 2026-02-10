
-- Create a SECURITY DEFINER function for Magic Merge task reassignment
-- This bypasses RLS so moderators can reassign any task in their org during merges
CREATE OR REPLACE FUNCTION public.magic_merge_reassign_task(
  _task_id UUID,
  _new_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _task_org_id UUID;
  _caller_role app_role;
BEGIN
  -- Get the task's organization
  SELECT organization_id INTO _task_org_id FROM tasks WHERE id = _task_id;
  IF _task_org_id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Verify caller is admin or moderator in that org
  SELECT role INTO _caller_role FROM user_roles
  WHERE user_id = auth.uid() AND organization_id = _task_org_id;

  IF _caller_role IS NULL OR _caller_role NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Insufficient permissions for Magic Merge';
  END IF;

  -- Update the task - bypass RLS
  UPDATE tasks
  SET assigned_user_id = _new_user_id,
      assignment_status = 'accepted'
  WHERE id = _task_id;
END;
$$;
