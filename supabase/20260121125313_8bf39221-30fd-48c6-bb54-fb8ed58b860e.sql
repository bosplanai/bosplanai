-- Add deleted_at columns for soft delete functionality in data rooms
ALTER TABLE public.data_room_files 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.data_room_folders 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of deleted items
CREATE INDEX idx_data_room_files_deleted_at ON public.data_room_files(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_data_room_folders_deleted_at ON public.data_room_folders(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add a function to permanently delete items older than 12 months
CREATE OR REPLACE FUNCTION public.cleanup_data_room_deleted_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete files that have been in recycling bin for more than 12 months
  DELETE FROM public.data_room_files
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '12 months';
    
  -- Delete folders that have been in recycling bin for more than 12 months
  DELETE FROM public.data_room_folders
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '12 months';
END;
$$;