-- Create table for custom navigation buttons
CREATE TABLE public.custom_nav_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add comment for clarity
COMMENT ON TABLE public.custom_nav_buttons IS 'Custom navigation buttons configured by super admins';

-- Enable RLS
ALTER TABLE public.custom_nav_buttons ENABLE ROW LEVEL SECURITY;

-- Everyone can read enabled buttons (for the navigation)
CREATE POLICY "Anyone can view enabled custom buttons"
  ON public.custom_nav_buttons
  FOR SELECT
  USING (is_enabled = true);

-- Super admins can view all buttons (managed via service role in edge functions)
-- Note: Full management is done via edge functions with service role key

-- Create trigger for updated_at
CREATE TRIGGER update_custom_nav_buttons_updated_at
  BEFORE UPDATE ON public.custom_nav_buttons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();