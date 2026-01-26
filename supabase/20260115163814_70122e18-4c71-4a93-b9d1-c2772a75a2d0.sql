-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create data rooms in their organization" ON public.data_rooms;

-- Create a new INSERT policy with fully qualified table reference
CREATE POLICY "Users can create data rooms in their organization" ON public.data_rooms 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = auth.uid() 
    AND public.user_roles.organization_id = organization_id
  )
);

-- Also update the SELECT policy to match user's accessible organizations
DROP POLICY IF EXISTS "Users can view data rooms in their organization" ON public.data_rooms;

CREATE POLICY "Users can view data rooms in their organization" ON public.data_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = auth.uid() 
    AND public.user_roles.organization_id = data_rooms.organization_id
  )
);