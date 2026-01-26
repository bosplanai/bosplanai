-- Add guest_invite_id column to allow permissions for NDA-signed guests
ALTER TABLE public.data_room_file_permissions 
  ADD COLUMN guest_invite_id UUID REFERENCES public.data_room_invites(id) ON DELETE CASCADE;

-- Make user_id nullable since permissions can be for team members OR guests
ALTER TABLE public.data_room_file_permissions 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or guest_invite_id is set, but not both
ALTER TABLE public.data_room_file_permissions
  ADD CONSTRAINT check_user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_invite_id IS NULL) OR
    (user_id IS NULL AND guest_invite_id IS NOT NULL)
  );

-- Update RLS policy to allow access based on guest_invite_id as well
DROP POLICY IF EXISTS "Users can view file permissions for files they have access to" ON public.data_room_file_permissions;
DROP POLICY IF EXISTS "Users can manage file permissions for their files" ON public.data_room_file_permissions;

-- Recreate policies
CREATE POLICY "Users can view file permissions" 
  ON public.data_room_file_permissions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage file permissions" 
  ON public.data_room_file_permissions 
  FOR ALL 
  USING (true);