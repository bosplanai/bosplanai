-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create data rooms in their organization" ON public.data_rooms;

-- Create a new INSERT policy that allows users to create data rooms in any organization they have a role in
CREATE POLICY "Users can create data rooms in their organization" ON public.data_rooms 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = data_rooms.organization_id
  )
);