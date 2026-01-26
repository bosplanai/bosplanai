-- Create table for Bosplan platform-wide templates (knowledge base)
CREATE TABLE public.bosplan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('business_management', 'accounting_management', 'marketing', 'team_management')),
  template_type TEXT NOT NULL DEFAULT 'document' CHECK (template_type IN ('task', 'document')),
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.bosplan_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active Bosplan templates
CREATE POLICY "Anyone can view active Bosplan templates"
ON public.bosplan_templates
FOR SELECT
USING (is_active = true);

-- Only super admins can manage Bosplan templates
CREATE POLICY "Super admins can insert Bosplan templates"
ON public.bosplan_templates
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update Bosplan templates"
ON public.bosplan_templates
FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete Bosplan templates"
ON public.bosplan_templates
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_bosplan_templates_updated_at
  BEFORE UPDATE ON public.bosplan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();