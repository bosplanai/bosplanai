-- Create bosplan_templates table for global templates accessible to all users
CREATE TABLE public.bosplan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('business_management', 'accounting_management', 'marketing', 'team_management')),
  template_type TEXT NOT NULL DEFAULT 'document' CHECK (template_type IN ('task', 'document')),
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.bosplan_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active templates (global templates)
CREATE POLICY "Anyone can view active templates"
ON public.bosplan_templates
FOR SELECT
USING (is_active = true);

-- Only super admins can manage templates
CREATE POLICY "Super admins can manage templates"
ON public.bosplan_templates
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_bosplan_templates_updated_at
BEFORE UPDATE ON public.bosplan_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the business templates
INSERT INTO public.bosplan_templates (name, description, category, template_type, file_name, file_path, mime_type) VALUES
-- Business Management templates
('Business Strategy Document', 'Comprehensive business strategy planning template', 'business_management', 'document', 'Business_Strategy_Document.docx', '/templates/Business_Strategy_Document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('Business Strategy Document 2', 'Alternative business strategy planning template', 'business_management', 'document', 'Business_Strategy_Document_2.docx', '/templates/Business_Strategy_Document_2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('Business Viability Structure', 'Template for assessing business viability and structure', 'business_management', 'document', 'Business_Viability_Structure.docx', '/templates/Business_Viability_Structure.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('Management Decision Making Matrix', 'Matrix template for structured management decision making', 'business_management', 'document', 'Management_Decision_Making_Matrix.docx', '/templates/Management_Decision_Making_Matrix.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),

-- Accounting Management templates
('Accounting Budget Planning Canvas', 'Canvas template for budget planning and financial forecasting', 'accounting_management', 'document', 'Accounting_Budget_Planning_Canvas.docx', '/templates/Accounting_Budget_Planning_Canvas.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('Accounting Financial Health Canvas', 'Canvas template for assessing organizational financial health', 'accounting_management', 'document', 'Accounting_Financial_Health_Canvas.docx', '/templates/Accounting_Financial_Health_Canvas.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),

-- Marketing templates
('Marketing Options Available Canvas', 'Canvas template for exploring available marketing options', 'marketing', 'document', 'Marketing_Options_Available_Canvas.docx', '/templates/Marketing_Options_Available_Canvas.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('Marketing Strategy', 'Comprehensive marketing strategy planning template', 'marketing', 'document', 'Marketing_Strategy.docx', '/templates/Marketing_Strategy.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),

-- Team Management templates
('Team Performance Canvas', 'Canvas template for tracking and improving team performance', 'team_management', 'document', 'Team_Performance_Canvas.docx', '/templates/Team_Performance_Canvas.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('Team Capability Skills Canvas', 'Canvas template for mapping team capabilities and skills', 'team_management', 'document', 'Team_Capability_Skills_Canvas.docx', '/templates/Team_Capability_Skills_Canvas.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');