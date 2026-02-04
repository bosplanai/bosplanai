-- Add assigned_to column to data_room_files for file assignment feature
ALTER TABLE public.data_room_files
ADD COLUMN assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_data_room_files_assigned_to ON public.data_room_files(assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN public.data_room_files.assigned_to IS 'User ID assigned to review this file';