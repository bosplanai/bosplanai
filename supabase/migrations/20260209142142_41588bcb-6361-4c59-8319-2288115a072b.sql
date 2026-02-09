-- Backfill completed_at for tasks that are already marked complete but missing the timestamp
UPDATE public.tasks 
SET completed_at = updated_at 
WHERE status = 'complete' AND completed_at IS NULL;