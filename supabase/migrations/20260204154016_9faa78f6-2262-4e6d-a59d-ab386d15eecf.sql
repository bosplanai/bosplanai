-- Add version column to data_room_files for tracking file versions
ALTER TABLE public.data_room_files 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create index for better query performance when filtering by version
CREATE INDEX IF NOT EXISTS idx_data_room_files_version ON public.data_room_files(version);