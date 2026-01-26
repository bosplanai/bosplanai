-- Fix RLS policy for data_room_files INSERT to allow uploads from any user with data room access
-- The organization_id should match the data room's organization, not the user's

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can upload files in accessible data rooms" ON public.data_room_files;

-- Create a helper function to get the organization_id of a data room
CREATE OR REPLACE FUNCTION public.get_data_room_organization_id(p_data_room_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.data_rooms 
  WHERE id = p_data_room_id
  LIMIT 1
$$;

-- Recreate the INSERT policy with corrected logic
-- Users can upload if they have access to the data room AND the organization_id matches the data room's org
CREATE POLICY "Users can upload files in accessible data rooms"
ON public.data_room_files
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND organization_id = public.get_data_room_organization_id(data_room_id)
  AND uploaded_by = auth.uid()
);