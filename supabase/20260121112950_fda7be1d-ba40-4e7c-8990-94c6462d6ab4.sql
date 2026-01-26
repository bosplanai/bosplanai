-- Fix data_room_folders INSERT policy for cross-org access
-- The folder should inherit organization_id from the data room, not require it to match user's org

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create folders in accessible data rooms" ON public.data_room_folders;

-- Create new INSERT policy that allows cross-org folder creation
-- Uses a subquery to verify the organization_id matches the data room's organization
CREATE POLICY "Users can create folders in accessible data rooms"
ON public.data_room_folders
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND created_by = auth.uid()
  AND organization_id = (SELECT organization_id FROM public.data_rooms WHERE id = data_room_id)
);

-- Add is_restricted column to data_room_folders for folder-level permissions
ALTER TABLE public.data_room_folders
ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;

-- Create data_room_folder_permissions table for granular folder access
CREATE TABLE IF NOT EXISTS public.data_room_folder_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid NOT NULL REFERENCES public.data_room_folders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_invite_id uuid REFERENCES public.data_room_invites(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT folder_permission_target CHECK (
    (user_id IS NOT NULL AND guest_invite_id IS NULL) OR
    (user_id IS NULL AND guest_invite_id IS NOT NULL)
  )
);

-- Enable RLS on folder permissions
ALTER TABLE public.data_room_folder_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for folder permissions
CREATE POLICY "Users can view folder permissions for accessible rooms"
ON public.data_room_folder_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_folders f
    WHERE f.id = folder_id
    AND public.user_can_access_data_room(f.data_room_id)
  )
);

CREATE POLICY "Folder creator can manage folder permissions"
ON public.data_room_folder_permissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_room_folders f
    WHERE f.id = folder_id
    AND f.created_by = auth.uid()
  )
);

CREATE POLICY "Folder creator can update folder permissions"
ON public.data_room_folder_permissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_folders f
    WHERE f.id = folder_id
    AND f.created_by = auth.uid()
  )
);

CREATE POLICY "Folder creator can delete folder permissions"
ON public.data_room_folder_permissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_folders f
    WHERE f.id = folder_id
    AND f.created_by = auth.uid()
  )
);

-- Update the UPDATE policy for folders to allow any member to update (for moving files, etc.)
-- But only creator or admin can toggle is_restricted
DROP POLICY IF EXISTS "Admins or creator can update folders in accessible data rooms" ON public.data_room_folders;

CREATE POLICY "Members can update folders in accessible data rooms"
ON public.data_room_folders
FOR UPDATE
USING (
  public.user_can_access_data_room(data_room_id)
)
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder_id ON public.data_room_folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_user_id ON public.data_room_folder_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_permissions_guest_invite_id ON public.data_room_folder_permissions(guest_invite_id);