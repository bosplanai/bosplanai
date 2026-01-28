-- Update notify_task_request_declined to also notify all Full Access (admin) users
CREATE OR REPLACE FUNCTION public.notify_task_request_declined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assignee_name TEXT;
  decline_msg TEXT;
  admin_record RECORD;
BEGIN
  IF OLD.assignment_status = 'pending' AND NEW.assignment_status = 'declined' THEN
    -- Get assignee name
    SELECT full_name INTO assignee_name
    FROM public.profiles
    WHERE id = NEW.assigned_user_id;
    
    -- Build message with optional decline reason
    decline_msg := COALESCE(assignee_name, 'Someone') || ' has declined the task: ' || COALESCE(NEW.title, 'Untitled');
    IF NEW.decline_reason IS NOT NULL AND NEW.decline_reason != '' THEN
      decline_msg := decline_msg || '. Reason: ' || NEW.decline_reason;
    END IF;
    
    -- Notify task creator (if exists)
    IF NEW.created_by_user_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
      VALUES (
        NEW.created_by_user_id,
        NEW.organization_id,
        'task_request_declined',
        'Task Request Declined',
        decline_msg,
        NEW.id,
        'task'
      );
    END IF;
    
    -- Notify all Full Access (admin) users in the organization (except the creator to avoid duplicate)
    IF NEW.organization_id IS NOT NULL THEN
      FOR admin_record IN 
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        WHERE ur.organization_id = NEW.organization_id
          AND ur.role = 'admin'
          AND ur.user_id != COALESCE(NEW.created_by_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
      LOOP
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
        VALUES (
          admin_record.user_id,
          NEW.organization_id,
          'task_request_declined',
          'Task Request Declined',
          decline_msg,
          NEW.id,
          'task'
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Also update notify_task_request_accepted to notify all Full Access (admin) users
CREATE OR REPLACE FUNCTION public.notify_task_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assignee_name TEXT;
  admin_record RECORD;
BEGIN
  IF OLD.assignment_status = 'pending' AND NEW.assignment_status = 'accepted' THEN
    -- Get assignee name
    SELECT full_name INTO assignee_name
    FROM public.profiles
    WHERE id = NEW.assigned_user_id;
    
    -- Notify task creator
    IF NEW.created_by_user_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
      VALUES (
        NEW.created_by_user_id,
        NEW.organization_id,
        'task_request_accepted',
        'Task Request Accepted',
        COALESCE(assignee_name, 'Someone') || ' has accepted the task: ' || COALESCE(NEW.title, 'Untitled'),
        NEW.id,
        'task'
      );
    END IF;
    
    -- Notify all Full Access (admin) users in the organization (except the creator to avoid duplicate)
    IF NEW.organization_id IS NOT NULL THEN
      FOR admin_record IN 
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        WHERE ur.organization_id = NEW.organization_id
          AND ur.role = 'admin'
          AND ur.user_id != COALESCE(NEW.created_by_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
      LOOP
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
        VALUES (
          admin_record.user_id,
          NEW.organization_id,
          'task_request_accepted',
          'Task Request Accepted',
          COALESCE(assignee_name, 'Someone') || ' has accepted the task: ' || COALESCE(NEW.title, 'Untitled'),
          NEW.id,
          'task'
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;