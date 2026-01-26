-- Add guest_uploaded_by column to track which guest uploaded a file
ALTER TABLE public.data_room_files 
ADD COLUMN IF NOT EXISTS guest_uploaded_by UUID REFERENCES public.data_room_invites(id) ON DELETE SET NULL;

-- Add index for querying files uploaded by guests
CREATE INDEX IF NOT EXISTS idx_data_room_files_guest_uploaded_by ON public.data_room_files(guest_uploaded_by);