-- Re-add tasks table to realtime publication (it was removed or failed previously)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;