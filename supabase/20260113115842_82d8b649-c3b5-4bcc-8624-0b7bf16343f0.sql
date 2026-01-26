-- Create table for storing user signatures
CREATE TABLE public.user_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;

-- Users can only see their own signatures
CREATE POLICY "Users can view their own signatures"
ON public.user_signatures
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own signatures
CREATE POLICY "Users can create their own signatures"
ON public.user_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own signatures
CREATE POLICY "Users can update their own signatures"
ON public.user_signatures
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own signatures
CREATE POLICY "Users can delete their own signatures"
ON public.user_signatures
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_signatures_updated_at
BEFORE UPDATE ON public.user_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_signatures_user_id ON public.user_signatures(user_id);

-- Function to ensure only one default signature per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_signatures 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_default_signature_trigger
BEFORE INSERT OR UPDATE ON public.user_signatures
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_signature();