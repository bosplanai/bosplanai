-- Update the NDA hash functions to use the extensions schema for digest
-- Drop and recreate the functions with correct schema reference

CREATE OR REPLACE FUNCTION public.calculate_nda_hash(content text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF content IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(extensions.digest(content, 'sha256'), 'hex');
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_nda_content_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.nda_content IS DISTINCT FROM OLD.nda_content THEN
    NEW.nda_content_hash := encode(extensions.digest(NEW.nda_content, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_nda_content_hash_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.nda_content IS NOT NULL AND NEW.nda_content_hash IS NULL THEN
    NEW.nda_content_hash := encode(extensions.digest(NEW.nda_content, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;