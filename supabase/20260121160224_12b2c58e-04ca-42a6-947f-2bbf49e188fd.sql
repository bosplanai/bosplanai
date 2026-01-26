-- Add assignment_status to tasks table for task request workflow
ALTER TABLE public.tasks 
ADD COLUMN assignment_status text NOT NULL DEFAULT 'accepted',
ADD COLUMN assignment_responded_at timestamp with time zone,
ADD COLUMN decline_reason text,
ADD COLUMN last_reminder_sent_at timestamp with time zone;

-- Add check constraint for assignment_status values
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assignment_status_check 
CHECK (assignment_status IN ('pending', 'accepted', 'declined'));

-- Update existing assigned tasks to 'accepted' status (migration requirement)
UPDATE public.tasks 
SET assignment_status = 'accepted' 
WHERE assigned_user_id IS NOT NULL;

-- Update unassigned tasks to 'accepted' (no assignment pending)
UPDATE public.tasks 
SET assignment_status = 'accepted' 
WHERE assigned_user_id IS NULL;

-- Create index for faster queries on pending task requests
CREATE INDEX idx_tasks_assignment_status ON public.tasks(assignment_status) WHERE assignment_status = 'pending';

-- Create index for reminder job efficiency
CREATE INDEX idx_tasks_pending_reminders ON public.tasks(assigned_user_id, assignment_status, created_at, last_reminder_sent_at) 
WHERE assignment_status = 'pending';

-- Create function to notify on task request (when task is assigned)
CREATE OR REPLACE FUNCTION public.notify_task_request()
RETURNS TRIGGER AS $$
DECLARE
  creator_name text;
  task_title text;
BEGIN
  -- Only trigger when a task is newly assigned (assigned_user_id changes from null or to a different user)
  -- and assignment_status is 'pending'
  IF NEW.assigned_user_id IS NOT NULL 
     AND NEW.assignment_status = 'pending'
     AND (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id OR OLD.assignment_status != 'pending') THEN
    
    -- Get creator name
    SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by_user_id;
    
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
      NEW.assigned_user_id,
      NEW.organization_id,
      'task_request',
      'New Task Request',
      COALESCE(creator_name, 'Someone') || ' has requested you to take on: ' || NEW.title,
      NEW.id,
      'task'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for task request notifications
DROP TRIGGER IF EXISTS on_task_request_notify ON public.tasks;
CREATE TRIGGER on_task_request_notify
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_request();

-- Create function to notify task creator on response
CREATE OR REPLACE FUNCTION public.notify_task_response()
RETURNS TRIGGER AS $$
DECLARE
  assignee_name text;
  creator_id uuid;
BEGIN
  -- Only trigger when assignment_status changes from 'pending' to 'accepted' or 'declined'
  IF OLD.assignment_status = 'pending' 
     AND NEW.assignment_status IN ('accepted', 'declined')
     AND NEW.created_by_user_id IS NOT NULL THEN
    
    -- Get assignee name
    SELECT full_name INTO assignee_name FROM public.profiles WHERE id = NEW.assigned_user_id;
    
    IF NEW.assignment_status = 'accepted' THEN
      -- Notify creator of acceptance
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        NEW.created_by_user_id,
        NEW.organization_id,
        'task_accepted',
        'Task Accepted',
        COALESCE(assignee_name, 'Someone') || ' has accepted the task: ' || NEW.title,
        NEW.id,
        'task'
      );
    ELSIF NEW.assignment_status = 'declined' THEN
      -- Notify creator of decline with reason
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        NEW.created_by_user_id,
        NEW.organization_id,
        'task_declined',
        'Task Declined',
        COALESCE(assignee_name, 'Someone') || ' has declined the task: ' || NEW.title || COALESCE('. Reason: ' || NEW.decline_reason, ''),
        NEW.id,
        'task'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for task response notifications
DROP TRIGGER IF EXISTS on_task_response_notify ON public.tasks;
CREATE TRIGGER on_task_response_notify
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_response();