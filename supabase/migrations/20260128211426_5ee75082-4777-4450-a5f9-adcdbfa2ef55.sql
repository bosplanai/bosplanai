-- Update notify_task_assignment to skip drafts
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_record RECORD;
  creator_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get task details including organization_id, creator, and draft status
    SELECT t.title, t.organization_id, t.created_by_user_id, t.is_draft, p.full_name 
    INTO task_record
    FROM public.tasks t
    LEFT JOIN public.profiles p ON p.id = t.created_by_user_id
    WHERE t.id = NEW.task_id;
    
    -- Skip notification if the task is a draft
    IF task_record.is_draft = true THEN
      RETURN NEW;
    END IF;
    
    -- Get creator name
    creator_name := COALESCE(task_record.full_name, 'Someone');
    
    IF task_record.organization_id IS NOT NULL AND NEW.user_id != NEW.assigned_by THEN
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
      VALUES (
        NEW.user_id,
        task_record.organization_id,
        'task_assigned',
        'Task Request',
        creator_name || ' has requested you to take on: ' || COALESCE(task_record.title, 'a task'),
        NEW.task_id,
        'task'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;