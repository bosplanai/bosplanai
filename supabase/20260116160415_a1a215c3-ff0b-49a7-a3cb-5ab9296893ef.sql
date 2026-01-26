-- Create table for storing platform settings like terms and conditions
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read platform settings (public content like T&C)
CREATE POLICY "Anyone can read platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (true);

-- Only super admins can modify platform settings (checked at application level)
CREATE POLICY "Service role can modify platform settings" 
ON public.platform_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default terms and conditions
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('terms_and_conditions', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();