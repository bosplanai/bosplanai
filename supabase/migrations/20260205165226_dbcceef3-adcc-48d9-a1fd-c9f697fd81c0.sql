-- Drop the existing status check constraint
ALTER TABLE public.data_rooms DROP CONSTRAINT IF EXISTS data_rooms_status_check;

-- Add new status check constraint that includes 'archived'
ALTER TABLE public.data_rooms ADD CONSTRAINT data_rooms_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'closed'::text, 'draft'::text, 'archived'::text]));