-- Add parent_file_id column to data_room_files for version tracking
ALTER TABLE public.data_room_files 
ADD COLUMN IF NOT EXISTS parent_file_id UUID REFERENCES public.data_room_files(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_data_room_files_parent_file_id ON public.data_room_files(parent_file_id);