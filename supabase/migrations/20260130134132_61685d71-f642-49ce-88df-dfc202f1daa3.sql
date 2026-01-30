-- Add column to track if welcome email has been sent
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;