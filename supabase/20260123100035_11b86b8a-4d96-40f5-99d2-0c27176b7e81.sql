-- Enable realtime for data_room_messages table so users get notified of new messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_messages;