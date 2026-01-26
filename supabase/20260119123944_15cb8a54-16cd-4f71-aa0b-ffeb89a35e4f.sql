-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can add comments in accessible data rooms" ON public.data_room_file_comments;

-- Create a new INSERT policy that allows users to comment if they have access to the data room
-- The organization_id must match the data room's organization_id (not the user's profile org)
CREATE POLICY "Users can add comments in accessible data rooms"
ON public.data_room_file_comments
FOR INSERT
WITH CHECK (
  user_can_access_data_room(data_room_id) 
  AND commenter_id = auth.uid()
  AND organization_id = (SELECT dr.organization_id FROM public.data_rooms dr WHERE dr.id = data_room_id)
);