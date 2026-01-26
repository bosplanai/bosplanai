-- Enable realtime for projects table so newly created projects sync across all components
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;