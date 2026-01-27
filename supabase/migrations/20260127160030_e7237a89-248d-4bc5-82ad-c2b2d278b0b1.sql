-- Create user_appearance_settings table
CREATE TABLE IF NOT EXISTS public.user_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  task_card_text_size NUMERIC DEFAULT 1.0,
  project_card_text_size NUMERIC DEFAULT 1.0,
  drive_file_text_size NUMERIC DEFAULT 1.0,
  brand_green TEXT DEFAULT '#8CC646',
  brand_coral TEXT DEFAULT '#DF4C33',
  brand_orange TEXT DEFAULT '#F5B536',
  brand_teal TEXT DEFAULT '#176884',
  secondary_background TEXT,
  secondary_foreground TEXT,
  status_todo_bg TEXT,
  status_in_progress_bg TEXT,
  status_complete_bg TEXT,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_appearance_settings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own settings
CREATE POLICY "Users can view their own appearance settings"
ON public.user_appearance_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own appearance settings"
ON public.user_appearance_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own appearance settings"
ON public.user_appearance_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete their own appearance settings"
ON public.user_appearance_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_appearance_settings_updated_at
BEFORE UPDATE ON public.user_appearance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_user_appearance_settings_user_id ON public.user_appearance_settings(user_id);