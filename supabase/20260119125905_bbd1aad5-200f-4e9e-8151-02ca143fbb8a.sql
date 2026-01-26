-- Add nda_content_hash column to data_rooms to track current NDA version
ALTER TABLE public.data_rooms 
ADD COLUMN IF NOT EXISTS nda_content_hash text;

-- Create a function to hash NDA content (same as edge function uses)
CREATE OR REPLACE FUNCTION public.calculate_nda_hash(content text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF content IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$;

-- Update existing data rooms to have their NDA content hashed
UPDATE public.data_rooms
SET nda_content_hash = encode(digest(nda_content, 'sha256'), 'hex')
WHERE nda_content IS NOT NULL AND nda_content_hash IS NULL;

-- Create a trigger to auto-update nda_content_hash when nda_content changes
CREATE OR REPLACE FUNCTION public.update_nda_content_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nda_content IS DISTINCT FROM OLD.nda_content THEN
    NEW.nda_content_hash := encode(digest(NEW.nda_content, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_nda_content_hash ON public.data_rooms;
CREATE TRIGGER trigger_update_nda_content_hash
  BEFORE UPDATE ON public.data_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nda_content_hash();

-- Also set hash on insert
CREATE OR REPLACE FUNCTION public.set_nda_content_hash_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nda_content IS NOT NULL AND NEW.nda_content_hash IS NULL THEN
    NEW.nda_content_hash := encode(digest(NEW.nda_content, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_nda_content_hash_on_insert ON public.data_rooms;
CREATE TRIGGER trigger_set_nda_content_hash_on_insert
  BEFORE INSERT ON public.data_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_nda_content_hash_on_insert();

-- Update the user_can_access_data_room function to check hash match
CREATE OR REPLACE FUNCTION public.user_can_access_data_room(p_data_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nda_required boolean;
  v_nda_content_hash text;
  v_owner uuid;
  v_signature_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT dr.nda_required, dr.created_by, dr.nda_content_hash
    INTO v_nda_required, v_owner, v_nda_content_hash
  FROM public.data_rooms dr
  WHERE dr.id = p_data_room_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Owner always has access
  IF v_owner = auth.uid() THEN
    RETURN true;
  END IF;

  -- Must be an internal member
  IF NOT EXISTS (
    SELECT 1
    FROM public.data_room_members m
    WHERE m.data_room_id = p_data_room_id
      AND m.user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  -- If NDA isn't required, membership is enough
  IF v_nda_required IS NOT TRUE THEN
    RETURN true;
  END IF;

  -- NDA required: signature must exist with matching hash
  SELECT s.nda_content_hash INTO v_signature_hash
  FROM public.data_room_nda_signatures s
  WHERE s.data_room_id = p_data_room_id
    AND s.user_id = auth.uid()
  ORDER BY s.signed_at DESC
  LIMIT 1;

  -- If no signature exists, deny access
  IF v_signature_hash IS NULL THEN
    RETURN false;
  END IF;

  -- If data room has no hash set yet (legacy), allow any signature
  IF v_nda_content_hash IS NULL THEN
    RETURN true;
  END IF;

  -- Check if signature hash matches current NDA hash
  RETURN v_signature_hash = v_nda_content_hash;
END;
$$;