-- Allow NDA re-signing when NDA content changes by versioning signatures with nda_content_hash

-- Remove legacy uniqueness constraint that prevented multiple signatures per invite
ALTER TABLE public.data_room_nda_signatures
DROP CONSTRAINT IF EXISTS data_room_nda_signatures_data_room_id_invite_id_key;

-- Prevent duplicate signatures for the same NDA version (guest invites)
CREATE UNIQUE INDEX IF NOT EXISTS data_room_nda_signatures_unique_invite_hash
ON public.data_room_nda_signatures (data_room_id, invite_id, nda_content_hash)
WHERE invite_id IS NOT NULL;

-- Prevent duplicate signatures for the same NDA version (internal users)
CREATE UNIQUE INDEX IF NOT EXISTS data_room_nda_signatures_unique_user_hash
ON public.data_room_nda_signatures (data_room_id, user_id, nda_content_hash)
WHERE user_id IS NOT NULL;
