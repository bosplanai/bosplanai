-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create private schema for internal functions
CREATE SCHEMA IF NOT EXISTS private;

-- Create a secure encryption key retrieval function
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT current_setting('app.encryption_key', true);
$$;

-- Create encryption function for PII fields
CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN plain_text;
  END IF;
  
  encryption_key := private.get_encryption_key();
  
  -- If no key is configured, return plaintext (allows gradual rollout)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN plain_text;
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      plain_text,
      encryption_key,
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- Create decryption function for PII fields
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN encrypted_text;
  END IF;
  
  encryption_key := private.get_encryption_key();
  
  -- If no key is configured, assume data is not encrypted
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN encrypted_text;
  END IF;
  
  -- Try to decrypt, if it fails (not encrypted), return as-is
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    -- Data might not be encrypted yet, return as-is
    RETURN encrypted_text;
  END;
END;
$$;

-- Create a function to check if a value is encrypted
CREATE OR REPLACE FUNCTION public.is_encrypted(value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF value IS NULL OR value = '' THEN
    RETURN false;
  END IF;
  
  -- Check if it looks like base64-encoded PGP data
  RETURN value ~ '^[A-Za-z0-9+/=]+$' AND length(value) > 50;
END;
$$;

-- Add comments explaining usage
COMMENT ON FUNCTION public.encrypt_pii IS 'Encrypts PII data using AES-256. Set app.encryption_key in database settings to enable.';
COMMENT ON FUNCTION public.decrypt_pii IS 'Decrypts PII data encrypted with encrypt_pii function.';

-- Create a view for profiles with decrypted PII (for authorized access)
CREATE OR REPLACE VIEW public.profiles_decrypted AS
SELECT 
  id,
  decrypt_pii(full_name) as full_name,
  decrypt_pii(phone_number) as phone_number,
  job_role,
  organization_id,
  onboarding_completed,
  is_virtual_assistant,
  scheduled_deletion_at,
  welcome_email_sent_at,
  created_at,
  updated_at
FROM public.profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_decrypted TO authenticated;

-- Create trigger function to auto-encrypt PII on insert/update for profiles
CREATE OR REPLACE FUNCTION public.encrypt_profile_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := private.get_encryption_key();
  
  -- Only encrypt if key is configured and value is not already encrypted
  IF encryption_key IS NOT NULL AND encryption_key != '' THEN
    -- Encrypt full_name if not already encrypted
    IF NEW.full_name IS NOT NULL AND NOT is_encrypted(NEW.full_name) THEN
      NEW.full_name := encrypt_pii(NEW.full_name);
    END IF;
    
    -- Encrypt phone_number if not already encrypted
    IF NEW.phone_number IS NOT NULL AND NOT is_encrypted(NEW.phone_number) THEN
      NEW.phone_number := encrypt_pii(NEW.phone_number);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-encryption on profiles table
DROP TRIGGER IF EXISTS encrypt_profile_pii_trigger ON public.profiles;
CREATE TRIGGER encrypt_profile_pii_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profile_pii();