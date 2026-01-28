-- Update the notify_task_request function to skip drafts
CREATE OR REPLACE FUNCTION public.notify_task_request()
RETURNS TRIGGER AS $$
DECLARE
  creator_name text;
  task_title text;
BEGIN
  -- Skip notification if the task is a draft
  IF NEW.is_draft = true THEN
    RETURN NEW;
  END IF;

  -- Only trigger when a task is newly assigned (assigned_user_id changes from null or to a different user)
  -- and assignment_status is 'pending'
  IF NEW.assigned_user_id IS NOT NULL 
     AND NEW.assignment_status = 'pending'
     AND (OLD IS NULL OR OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id OR OLD.assignment_status != 'pending') THEN
    
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