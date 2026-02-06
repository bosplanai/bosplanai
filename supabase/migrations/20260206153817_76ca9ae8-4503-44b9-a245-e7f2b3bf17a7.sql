-- Add deleted_at column to projects table for soft delete support
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of deleted projects
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);