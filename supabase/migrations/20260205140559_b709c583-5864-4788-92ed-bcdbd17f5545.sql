-- Create trigger function to notify data room members when a new message is posted
CREATE OR REPLACE FUNCTION public.notify_data_room_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_name TEXT;
  org_id UUID;
  member_record RECORD;
BEGIN
  -- Get data room name and organization
  SELECT name, organization_id INTO room_name, org_id
  FROM public.data_rooms
  WHERE id = NEW.data_room_id;

  -- Notify all data room members except the sender
  FOR member_record IN
    SELECT DISTINCT drm.user_id
    FROM public.data_room_members drm
    WHERE drm.data_room_id = NEW.data_room_id
    AND (NEW.sender_id IS NULL OR drm.user_id != NEW.sender_id)
  LOOP
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      is_read
    ) VALUES (
      member_record.user_id,
      org_id,
      'data_room_message',
      'New message in ' || COALESCE(room_name, 'Data Room'),
      NEW.sender_name || ' sent a message in ' || COALESCE(room_name, 'Data Room'),
      NEW.data_room_id,
      'data_room',
      false
    );
  END LOOP;

  -- Also notify the data room creator if they're not already a member and not the sender
  INSERT INTO public.notifications (
    user_id,
    organization_id,
    type,
    title,
    message,
    reference_id,
    reference_type,
    is_read
  )
  SELECT 
    dr.created_by,
    org_id,
    'data_room_message',
    'New message in ' || COALESCE(room_name, 'Data Room'),
    NEW.sender_name || ' sent a message in ' || COALESCE(room_name, 'Data Room'),
    NEW.data_room_id,
    'data_room',
    false
  FROM public.data_rooms dr
  WHERE dr.id = NEW.data_room_id
  AND (NEW.sender_id IS NULL OR dr.created_by != NEW.sender_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.data_room_members drm 
    WHERE drm.data_room_id = NEW.data_room_id 
    AND drm.user_id = dr.created_by
  );

  RETURN NEW;
END;
$$;

-- Create trigger for data room message notifications
DROP TRIGGER IF EXISTS on_data_room_message_notify ON public.data_room_messages;
CREATE TRIGGER on_data_room_message_notify
  AFTER INSERT ON public.data_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_data_room_message();