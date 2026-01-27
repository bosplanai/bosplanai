-- Add onboarding_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add is_virtual_assistant column (referenced in code but may be missing)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_virtual_assistant boolean NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the Task Populate onboarding wizard';
COMMENT ON COLUMN public.profiles.is_virtual_assistant IS 'Whether this profile belongs to a virtual assistant account';