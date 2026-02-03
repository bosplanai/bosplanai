-- Create table to store super admin OTP codes
CREATE TABLE public.super_admin_otp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_otp ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - this table is only accessed by edge functions using service role key

-- Create index for faster lookups
CREATE INDEX idx_super_admin_otp_user_id ON public.super_admin_otp(user_id);
CREATE INDEX idx_super_admin_otp_expires_at ON public.super_admin_otp(expires_at);

-- Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM public.super_admin_otp WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;