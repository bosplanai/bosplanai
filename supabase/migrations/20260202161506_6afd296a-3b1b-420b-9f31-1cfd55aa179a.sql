-- Add per-assignee acceptance tracking to task_assignments table
ALTER TABLE public.task_assignments
ADD COLUMN assignment_status text NOT NULL DEFAULT 'pending',
ADD COLUMN accepted_at timestamp with time zone,
ADD COLUMN declined_at timestamp with time zone,
ADD COLUMN decline_reason text;

-- Add check constraint for assignment_status values
ALTER TABLE public.task_assignments
ADD CONSTRAINT task_assignments_status_check 
CHECK (assignment_status IN ('pending', 'accepted', 'declined'));

-- Migrate existing assignments to 'accepted' (they were created before this workflow)
UPDATE public.task_assignments 
SET assignment_status = 'accepted', accepted_at = created_at
WHERE assignment_status = 'pending';

-- Index for efficient pending request queries
CREATE INDEX idx_task_assignments_pending 
ON public.task_assignments(user_id, assignment_status) 
WHERE assignment_status = 'pending';

-- Update the notify_task_request trigger to work with task_assignments
-- This notifies each assignee when they're added to a task
CREATE OR REPLACE FUNCTION public.notify_task_assignment_request()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  creator_name text;
BEGIN
  -- Only trigger on new pending assignments to other users
  IF TG_OP = 'INSERT' AND NEW.assignment_status = 'pending' THEN
    -- Get task details
    SELECT id, title, organization_id, created_by_user_id 
    INTO task_record 
    FROM public.tasks 
    WHERE id = NEW.task_id;
    
    -- Don't notify if assigning to self
    IF NEW.assigned_by = NEW.user_id THEN
      RETURN NEW;
    END IF;
    
    -- Get creator name
    SELECT full_name INTO creator_name 
    FROM public.profiles 
    WHERE id = NEW.assigned_by;
    
    -- Insert notification for the assignee
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      reference_id,
      reference_type
    ) VALUES (
      NEW.user_id,
      task_record.organization_id,
      'task_request',
      'New Task Request',
      COALESCE(creator_name, 'Someone') || ' has requested you to take on: ' || task_record.title,
      NEW.task_id,
      'task'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment request notifications
DROP TRIGGER IF EXISTS on_task_assignment_request_notify ON public.task_assignments;
CREATE TRIGGER on_task_assignment_request_notify
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment_request();

-- Create function to notify task creator when assignee responds
CREATE OR REPLACE FUNCTION public.notify_task_assignment_response()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  assignee_name text;
  org_admins RECORD;
BEGIN
  -- Only trigger when assignment_status changes from 'pending'
  IF OLD.assignment_status = 'pending' AND NEW.assignment_status IN ('accepted', 'declined') THEN
    -- Get task details
    SELECT id, title, organization_id, created_by_user_id 
    INTO task_record 
    FROM public.tasks 
    WHERE id = NEW.task_id;
    
    -- Get assignee name
    SELECT full_name INTO assignee_name 
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    IF NEW.assignment_status = 'accepted' THEN
      -- Notify task creator of acceptance
      IF task_record.created_by_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id,
          organization_id,
          type,
          title,
          message,
          reference_id,
          reference_type
        ) VALUES (
          task_record.created_by_user_id,
          task_record.organization_id,
          'task_accepted',
          'Task Accepted',
          COALESCE(assignee_name, 'Someone') || ' has accepted the task: ' || task_record.title,
          NEW.task_id,
          'task'
        );
      END IF;
      
      -- Notify admins (excluding creator to avoid duplicate)
      FOR org_admins IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.organization_id = task_record.organization_id 
        AND ur.role = 'admin'
        AND ur.user_id != COALESCE(task_record.created_by_user_id, '00000000-0000-0000-0000-000000000000')
      LOOP
        INSERT INTO public.notifications (
          user_id,
          organization_id,
          type,
          title,
          message,
          reference_id,
          reference_type
        ) VALUES (
          org_admins.user_id,
          task_record.organization_id,
          'task_accepted',
          'Task Accepted',
          COALESCE(assignee_name, 'Someone') || ' has accepted the task: ' || task_record.title,
          NEW.task_id,
          'task'
        );
      END LOOP;
      
    ELSIF NEW.assignment_status = 'declined' THEN
      -- Notify task creator of decline
      IF task_record.created_by_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id,
          organization_id,
          type,
          title,
          message,
          reference_id,
          reference_type
        ) VALUES (
          task_record.created_by_user_id,
          task_record.organization_id,
          'task_declined',
          'Task Declined',
          COALESCE(assignee_name, 'Someone') || ' has declined the task: ' || task_record.title || 
            COALESCE('. Reason: ' || NEW.decline_reason, ''),
          NEW.task_id,
          'task'
        );
      END IF;
      
      -- Notify admins (excluding creator)
      FOR org_admins IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.organization_id = task_record.organization_id 
        AND ur.role = 'admin'
        AND ur.user_id != COALESCE(task_record.created_by_user_id, '00000000-0000-0000-0000-000000000000')
      LOOP
        INSERT INTO public.notifications (
          user_id,
          organization_id,
          type,
          title,
          message,
          reference_id,
          reference_type
        ) VALUES (
          org_admins.user_id,
          task_record.organization_id,
          'task_declined',
          'Task Declined',
          COALESCE(assignee_name, 'Someone') || ' has declined the task: ' || task_record.title || 
            COALESCE('. Reason: ' || NEW.decline_reason, ''),
          NEW.task_id,
          'task'
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment response notifications
DROP TRIGGER IF EXISTS on_task_assignment_response_notify ON public.task_assignments;
CREATE TRIGGER on_task_assignment_response_notify
  AFTER UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment_response();

-- Function to handle decline - removes the assignment
CREATE OR REPLACE FUNCTION public.decline_task_assignment(
  p_task_id uuid,
  p_decline_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First update to 'declined' to trigger the notification
  UPDATE public.task_assignments
  SET 
    assignment_status = 'declined',
    declined_at = now(),
    decline_reason = p_decline_reason
  WHERE task_id = p_task_id 
    AND user_id = auth.uid()
    AND assignment_status = 'pending';
  
  -- Then delete the assignment
  DELETE FROM public.task_assignments
  WHERE task_id = p_task_id 
    AND user_id = auth.uid()
    AND assignment_status = 'declined';
END;
$$;

-- Function to accept task assignment
CREATE OR REPLACE FUNCTION public.accept_task_assignment(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.task_assignments
  SET 
    assignment_status = 'accepted',
    accepted_at = now()
  WHERE task_id = p_task_id 
    AND user_id = auth.uid()
    AND assignment_status = 'pending';
END;
$$;