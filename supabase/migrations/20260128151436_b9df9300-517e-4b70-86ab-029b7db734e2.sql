-- =====================================================
-- NOTIFICATIONS TABLE AND COMPLETE NOTIFICATION SYSTEM
-- =====================================================

-- Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System/triggers can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================
-- CLEANUP FUNCTION - Delete notifications older than 7 days
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Trigger to clean up old notifications on each insert (auto-cleanup)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '7 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_notifications_trigger ON public.notifications;
CREATE TRIGGER cleanup_notifications_trigger
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_expired_notifications();

-- =====================================================
-- TASK ASSIGNMENT NOTIFICATION
-- When a task is assigned to a user, notify the assignee
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_record RECORD;
  creator_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get task details including organization_id and creator
    SELECT t.title, t.organization_id, t.created_by_user_id, p.full_name 
    INTO task_record
    FROM public.tasks t
    LEFT JOIN public.profiles p ON p.id = t.created_by_user_id
    WHERE t.id = NEW.task_id;
    
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
$$;

DROP TRIGGER IF EXISTS on_task_assignment_notify ON public.task_assignments;
CREATE TRIGGER on_task_assignment_notify
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();

-- =====================================================
-- TASK REQUEST ACCEPTED NOTIFICATION
-- When assignment_status changes to 'accepted', notify the creator
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_task_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
BEGIN
  IF OLD.assignment_status = 'pending' AND NEW.assignment_status = 'accepted' THEN
    -- Get assignee name
    SELECT full_name INTO assignee_name
    FROM public.profiles
    WHERE id = NEW.assigned_user_id;
    
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_request_accepted ON public.tasks;
CREATE TRIGGER on_task_request_accepted
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.assignment_status IS DISTINCT FROM NEW.assignment_status)
  EXECUTE FUNCTION public.notify_task_request_accepted();

-- =====================================================
-- TASK REQUEST DECLINED NOTIFICATION
-- When assignment_status changes to 'declined', notify the creator
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_task_request_declined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name TEXT;
  decline_msg TEXT;
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_request_declined ON public.tasks;
CREATE TRIGGER on_task_request_declined
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.assignment_status IS DISTINCT FROM NEW.assignment_status)
  EXECUTE FUNCTION public.notify_task_request_declined();

-- =====================================================
-- TASK COMPLETED NOTIFICATION
-- When a task is marked complete, notify the creator and all Full Access users
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  IF OLD.status != 'complete' AND NEW.status = 'complete' AND NEW.organization_id IS NOT NULL THEN
    -- Notify task creator (if exists and different from completer)
    IF NEW.created_by_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
      VALUES (
        NEW.created_by_user_id,
        NEW.organization_id,
        'task_completed',
        'Task Completed',
        'Task completed: ' || COALESCE(NEW.title, 'Untitled'),
        NEW.id,
        'task'
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Notify all Full Access (admin) users in the organization
    FOR admin_record IN 
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.organization_id = NEW.organization_id
        AND ur.role = 'admin'
        AND ur.user_id != NEW.created_by_user_id
    LOOP
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
      VALUES (
        admin_record.user_id,
        NEW.organization_id,
        'task_completed',
        'Task Completed',
        'Task completed: ' || COALESCE(NEW.title, 'Untitled'),
        NEW.id,
        'task'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_completed ON public.tasks;
CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_task_completed();

-- =====================================================
-- FILE SHARED NOTIFICATION
-- When a file is shared with a user in Bosdrive
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_file_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name, organization_id INTO file_record 
    FROM public.drive_files 
    WHERE id = NEW.file_id;
    
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
    VALUES (
      NEW.granted_to,
      file_record.organization_id,
      'file_shared',
      'File Shared',
      'A file has been shared with you in Bosdrive: ' || COALESCE(file_record.name, 'Untitled'),
      NEW.file_id,
      'file'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- FILE ASSIGNED FOR REVIEW NOTIFICATION
-- When a file is assigned to a user for review
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_file_review_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'file_review',
      'File Review Assigned',
      'A file has been assigned to you for review in Bosdrive: ' || COALESCE(NEW.name, 'Untitled'),
      NEW.id,
      'file'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_file_review_assigned ON public.drive_files;
CREATE TRIGGER on_file_review_assigned
  AFTER UPDATE ON public.drive_files
  FOR EACH ROW
  WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION public.notify_file_review_assigned();

-- =====================================================
-- DATA ROOM MEMBER ADDED NOTIFICATION
-- When an internal team member is added to a data room
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_data_room_member_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record RECORD;
  adder_name TEXT;
BEGIN
  -- Get the data room name and organization
  SELECT dr.name, dr.organization_id INTO room_record
  FROM public.data_rooms dr
  WHERE dr.id = NEW.data_room_id;
  
  -- Get the name of the person who added the member
  SELECT full_name INTO adder_name 
  FROM public.profiles 
  WHERE id = NEW.created_by;
  
  -- Create notification for the new member
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.user_id,
    room_record.organization_id,
    'data_room_invite',
    'Data Room Access Granted',
    'You have been added to the data room: ' || COALESCE(room_record.name, 'Untitled') || ' by ' || COALESCE(adder_name, 'a team member'),
    NEW.data_room_id,
    'data_room'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_data_room_member_notify ON public.data_room_members;
DROP TRIGGER IF EXISTS notify_data_room_member_added_trigger ON public.data_room_members;
CREATE TRIGGER on_data_room_member_notify
  AFTER INSERT ON public.data_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_data_room_member_added();

-- =====================================================
-- NDA SIGNED NOTIFICATION
-- When an NDA is signed, notify the data room owner
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_nda_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record RECORD;
BEGIN
  -- Get the data room details and creator
  SELECT dr.id, dr.name, dr.created_by, dr.organization_id 
  INTO room_record
  FROM public.data_rooms dr
  WHERE dr.id = NEW.data_room_id;
  
  -- Create notification for the data room creator (owner)
  IF room_record.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
    VALUES (
      room_record.created_by,
      room_record.organization_id,
      'nda_signed',
      'NDA Signed',
      NEW.signer_name || ' has signed the NDA for data room: ' || COALESCE(room_record.name, 'Untitled'),
      NEW.data_room_id,
      'data_room'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_nda_signed_trigger ON public.data_room_nda_signatures;
CREATE TRIGGER on_nda_signed_notify
  AFTER INSERT ON public.data_room_nda_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_nda_signed();