-- Add archived_at column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived_at column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient archive queries
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON public.projects(archived_at);

-- Create index for efficient auto-archive queries (completed_at + status)
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks(completed_at) WHERE status = 'complete' AND archived_at IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status_updated ON public.projects(updated_at) WHERE status = 'done' AND archived_at IS NULL;