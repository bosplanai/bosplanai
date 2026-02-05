-- Add guest_invite_id column to support granting access to external guests
ALTER TABLE public.data_room_file_permissions
ADD COLUMN guest_invite_id uuid REFERENCES public.data_room_invites(id) ON DELETE CASCADE;

-- Make user_id nullable since we'll either have user_id OR guest_invite_id
ALTER TABLE public.data_room_file_permissions
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or guest_invite_id is set (not both, not neither)
ALTER TABLE public.data_room_file_permissions
ADD CONSTRAINT user_or_guest_required 
CHECK (
  (user_id IS NOT NULL AND guest_invite_id IS NULL) OR 
  (user_id IS NULL AND guest_invite_id IS NOT NULL)
);

-- Update permission_level default to 'full' since we're simplifying to full access only
ALTER TABLE public.data_room_file_permissions
ALTER COLUMN permission_level SET DEFAULT 'full';

-- Update existing permissions to 'full'
UPDATE public.data_room_file_permissions SET permission_level = 'full';

-- Update the SELECT policy to allow users to see permissions for files they're granted access to
DROP POLICY IF EXISTS "Users can view permissions for their files" ON public.data_room_file_permissions;
CREATE POLICY "Users can view permissions for their files"
ON public.data_room_file_permissions
FOR SELECT
USING (
  -- User is the one granted access
  user_id = auth.uid()
  OR
  -- User uploaded the file
  EXISTS (
    SELECT 1 FROM data_room_files 
    WHERE id = file_id AND uploaded_by = auth.uid()
  )
);