-- Fix function search path for cleanup_expired_otp
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM public.super_admin_otp WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;