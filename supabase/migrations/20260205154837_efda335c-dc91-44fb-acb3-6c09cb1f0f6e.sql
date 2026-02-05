-- Drop the existing check constraint on permission_level
ALTER TABLE public.data_room_file_permissions
DROP CONSTRAINT IF EXISTS data_room_file_permissions_permission_level_check;

-- Add new check constraint that allows 'full' (our simplified model)
ALTER TABLE public.data_room_file_permissions
ADD CONSTRAINT data_room_file_permissions_permission_level_check 
CHECK (permission_level IN ('view', 'edit', 'full'));