-- Enable full replica identity on tasks table for real-time filtered subscriptions
ALTER TABLE public.tasks REPLICA IDENTITY FULL;