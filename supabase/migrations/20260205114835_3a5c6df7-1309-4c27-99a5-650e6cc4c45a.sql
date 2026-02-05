-- Enable realtime for data_room_files table so version changes sync across all users
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_files;