-- Fix the security definer view by using SECURITY INVOKER instead
-- This ensures RLS policies of the querying user are respected
DROP VIEW IF EXISTS public.profiles_decrypted;

CREATE VIEW public.profiles_decrypted
WITH (security_invoker = true)
AS
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