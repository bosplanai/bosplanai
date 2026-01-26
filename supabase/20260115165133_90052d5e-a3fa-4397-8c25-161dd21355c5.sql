-- Add is_draft column to tasks table for draft functionality
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Create index for draft filtering
CREATE INDEX IF NOT EXISTS idx_tasks_is_draft ON public.tasks(is_draft);