-- Add soft delete and archive columns to data_rooms table
ALTER TABLE public.data_rooms 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of active rooms
CREATE INDEX IF NOT EXISTS idx_data_rooms_deleted_at ON public.data_rooms(deleted_at);
CREATE INDEX IF NOT EXISTS idx_data_rooms_status_deleted ON public.data_rooms(status, deleted_at);

-- Update existing RLS policies to exclude deleted rooms from normal queries
-- (The application code will filter by deleted_at IS NULL for active rooms)