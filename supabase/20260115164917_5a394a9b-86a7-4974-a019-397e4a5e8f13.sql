-- Add status column to data_rooms table for archive functionality
ALTER TABLE public.data_rooms ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_data_rooms_status ON public.data_rooms(status);