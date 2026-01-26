-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view invites in their organization" ON public.data_room_invites;

-- Create new policy that allows viewing invites if:
-- 1. User belongs to the organization, OR
-- 2. User is a member of the data room (added by owner), OR
-- 3. User is the one who invited (invited_by)
CREATE POLICY "Users can view invites for accessible data rooms" 
ON public.data_room_invites 
FOR SELECT 
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM data_room_members 
    WHERE data_room_members.data_room_id = data_room_invites.data_room_id 
    AND data_room_members.user_id = auth.uid()
  )
);