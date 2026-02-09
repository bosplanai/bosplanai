-- Enable full replica identity on task_assignments table for real-time filtered subscriptions
ALTER TABLE public.task_assignments REPLICA IDENTITY FULL;

-- Also add task_assignments to the realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'task_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;
  END IF;
END $$;

-- Ensure tasks table is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;