-- Add password column for guest data room access
ALTER TABLE public.data_room_invites 
ADD COLUMN IF NOT EXISTS access_password text;

-- Add comment explaining the field
COMMENT ON COLUMN public.data_room_invites.access_password IS 'Hashed password for guest access authentication';