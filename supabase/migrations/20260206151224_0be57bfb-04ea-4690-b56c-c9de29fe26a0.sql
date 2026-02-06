-- Add status column to data_room_files table
ALTER TABLE public.data_room_files 
ADD COLUMN status text NOT NULL DEFAULT 'review_pending';

-- Add index for status queries
CREATE INDEX idx_data_room_files_status ON public.data_room_files(status);

-- Add comment for documentation
COMMENT ON COLUMN public.data_room_files.status IS 'File review status: review_pending, in_review, completed, review_failed';