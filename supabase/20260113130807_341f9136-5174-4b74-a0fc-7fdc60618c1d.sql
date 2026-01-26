-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Allow system to insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create notification for task assignment
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    task_title TEXT;
BEGIN
    -- Only trigger on assignment changes
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)) THEN
        IF NEW.assigned_to IS NOT NULL THEN
            SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
            
            INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
            VALUES (
                NEW.user_id,
                NEW.organization_id,
                'task_assigned',
                'Task Assigned',
                'You have been assigned to: ' || COALESCE(task_title, 'a task'),
                NEW.task_id,
                'task'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for task assignments
CREATE TRIGGER on_task_assignment
AFTER INSERT OR UPDATE ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- Function to notify when task is completed
CREATE OR REPLACE FUNCTION public.notify_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigner_id UUID;
    assigner_role TEXT;
    full_access_user RECORD;
BEGIN
    -- Only trigger when status changes to 'complete'
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'complete') THEN
        -- Notify managers who assigned this task
        FOR assigner_id IN 
            SELECT DISTINCT ta.user_id 
            FROM public.task_assignments ta
            JOIN public.user_roles ur ON ta.user_id = ur.user_id AND ta.organization_id = ur.organization_id
            WHERE ta.task_id = NEW.id AND ur.role = 'member'
        LOOP
            -- Check if the assigner assigned someone else to this task
            IF EXISTS (
                SELECT 1 FROM public.task_assignments 
                WHERE task_id = NEW.id AND user_id != assigner_id
            ) THEN
                INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
                VALUES (
                    assigner_id,
                    NEW.organization_id,
                    'task_completed',
                    'Task Completed',
                    'Task completed: ' || NEW.title,
                    NEW.id,
                    'task'
                );
            END IF;
        END LOOP;

        -- Notify all full access (admin) users in the organization
        FOR full_access_user IN 
            SELECT ur.user_id 
            FROM public.user_roles ur
            WHERE ur.organization_id = NEW.organization_id AND ur.role = 'admin'
        LOOP
            INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
            VALUES (
                full_access_user.user_id,
                NEW.organization_id,
                'task_completed',
                'Task Completed',
                'Task completed: ' || NEW.title,
                NEW.id,
                'task'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for task completion
CREATE TRIGGER on_task_completion
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_completion();

-- Function to notify when file is shared
CREATE OR REPLACE FUNCTION public.notify_file_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    file_name TEXT;
    file_org_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT name, organization_id INTO file_name, file_org_id 
        FROM public.drive_files 
        WHERE id = NEW.file_id;
        
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            file_org_id,
            'file_shared',
            'File Shared',
            'A file has been shared with you: ' || COALESCE(file_name, 'Untitled'),
            NEW.file_id,
            'file'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for file sharing
CREATE TRIGGER on_file_shared
AFTER INSERT ON public.drive_file_access
FOR EACH ROW
EXECUTE FUNCTION public.notify_file_shared();

-- Function to notify when file is assigned for review
CREATE OR REPLACE FUNCTION public.notify_file_assigned_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only trigger on assignment changes
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
        VALUES (
            NEW.assigned_to,
            NEW.organization_id,
            'file_review',
            'File Assigned for Review',
            'A file has been assigned to you for review: ' || COALESCE(NEW.name, 'Untitled'),
            NEW.id,
            'file'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for file review assignment
CREATE TRIGGER on_file_assigned_review
AFTER INSERT OR UPDATE ON public.drive_files
FOR EACH ROW
EXECUTE FUNCTION public.notify_file_assigned_review();