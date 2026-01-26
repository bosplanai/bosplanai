-- Allow NDA signatures for internal team members (make invite_id nullable)
ALTER TABLE public.data_room_nda_signatures 
ALTER COLUMN invite_id DROP NOT NULL;

-- Add user_id column for internal member signatures
ALTER TABLE public.data_room_nda_signatures 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_data_room_nda_signatures_user_id 
ON public.data_room_nda_signatures(user_id);

CREATE INDEX IF NOT EXISTS idx_data_room_nda_signatures_data_room_user 
ON public.data_room_nda_signatures(data_room_id, user_id);

-- RLS policies for internal member NDA signatures
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.data_room_nda_signatures;
CREATE POLICY "Users can view their own signatures"
ON public.data_room_nda_signatures
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_nda_signatures.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own signatures" ON public.data_room_nda_signatures;
CREATE POLICY "Users can create their own signatures"
ON public.data_room_nda_signatures
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR invite_id IS NOT NULL
);