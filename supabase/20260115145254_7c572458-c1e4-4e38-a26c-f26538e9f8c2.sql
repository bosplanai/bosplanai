-- Add scheduled deletion column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create a comment explaining the column
COMMENT ON COLUMN public.organizations.scheduled_deletion_at IS 'When set, the organization is scheduled for deletion on this date';