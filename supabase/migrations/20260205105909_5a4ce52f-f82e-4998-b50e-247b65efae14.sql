-- Add assigned_guest_id column to data_room_files for assigning files to external guests
ALTER TABLE public.data_room_files 
ADD COLUMN IF NOT EXISTS assigned_guest_id UUID REFERENCES public.data_room_invites(id) ON DELETE SET NULL;

-- Add index for querying files assigned to guests
CREATE INDEX IF NOT EXISTS idx_data_room_files_assigned_guest_id ON public.data_room_files(assigned_guest_id);