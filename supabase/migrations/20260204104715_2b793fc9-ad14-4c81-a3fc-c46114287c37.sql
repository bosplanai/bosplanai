-- Add temporary_start_date column to task_merge_logs table
ALTER TABLE public.task_merge_logs
ADD COLUMN temporary_start_date date;

-- Add a comment explaining the column
COMMENT ON COLUMN public.task_merge_logs.temporary_start_date IS 'Start date for temporary merges - when the task transfer becomes active';