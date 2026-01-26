-- Create a function to delete notifications older than 7 days
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

-- Create a trigger function to clean up old notifications on any insert
-- This ensures cleanup happens regularly without needing pg_cron
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete notifications older than 7 days
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '7 days';
  RETURN NEW;
END;
$$;

-- Create trigger to run cleanup on each new notification insert
DROP TRIGGER IF EXISTS cleanup_notifications_trigger ON public.notifications;
CREATE TRIGGER cleanup_notifications_trigger
  AFTER INSERT ON public.notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_expired_notifications();