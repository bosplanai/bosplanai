-- Fix data room chat: allow message inserts based on the room's organization rather than the sender's profile organization

DROP POLICY IF EXISTS "Users can send messages in accessible data rooms" ON public.data_room_messages;

CREATE POLICY "Users can send messages in accessible data rooms"
ON public.data_room_messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_can_access_data_room(data_room_id)
  AND organization_id = get_data_room_organization_id(data_room_id)
  AND sender_id = auth.uid()
  AND is_guest = false
);
