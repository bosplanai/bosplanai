-- Fix the notify_task_assignment trigger function
-- The task_assignments table has user_id (not assigned_to) and no organization_id column
-- We need to get organization_id from the tasks table

CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Only trigger on new assignments
    IF TG_OP = 'INSERT' THEN
        -- Get task details including organization_id
        SELECT title, organization_id INTO task_record 
        FROM public.tasks 
        WHERE id = NEW.task_id;
        
        IF task_record.organization_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
            VALUES (
                NEW.user_id,
                task_record.organization_id,
                'task_assigned',
                'Task Assigned',
                'You have been assigned to: ' || COALESCE(task_record.title, 'a task'),
                NEW.task_id,
                'task'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;