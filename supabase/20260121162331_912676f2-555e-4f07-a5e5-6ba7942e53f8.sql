-- Add is_virtual_assistant flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_virtual_assistant BOOLEAN NOT NULL DEFAULT false;