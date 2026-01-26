-- Enable realtime for data room files and folders
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_folders;