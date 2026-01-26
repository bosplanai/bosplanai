-- Create template folders table
CREATE TABLE public.template_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to templates table
ALTER TABLE public.templates 
ADD COLUMN folder_id UUID REFERENCES public.template_folders(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.template_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for template folders
CREATE POLICY "Users can view folders in their organization" 
ON public.template_folders 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create folders in their organization" 
ON public.template_folders 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update folders in their organization" 
ON public.template_folders 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete folders in their organization" 
ON public.template_folders 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_template_folders_updated_at
BEFORE UPDATE ON public.template_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();