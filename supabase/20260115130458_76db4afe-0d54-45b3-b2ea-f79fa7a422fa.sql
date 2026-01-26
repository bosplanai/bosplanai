-- Insert Bosplan business templates
INSERT INTO public.bosplan_templates (name, description, category, template_type, file_name, file_path, file_size, mime_type, is_active)
VALUES
  -- Business Management
  ('Business Viability Structure', 'A comprehensive canvas for assessing business viability and structural planning', 'business_management', 'document', 'Business_Viability_Structure.docx', '/templates/Business_Viability_Structure.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  ('Business Strategy Document', 'Strategic planning document for defining business direction and goals', 'business_management', 'document', 'Business_Strategy_Document.docx', '/templates/Business_Strategy_Document.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  ('Management Decision Making Matrix', 'A structured matrix for making informed management decisions', 'business_management', 'document', 'Management_Decision_Making_Matrix.docx', '/templates/Management_Decision_Making_Matrix.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  
  -- Accounting Management
  ('Budget Planning Canvas', 'A planning canvas for comprehensive budget development and tracking', 'accounting_management', 'document', 'Accounting_Budget_Planning_Canvas.docx', '/templates/Accounting_Budget_Planning_Canvas.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  ('Financial Health Canvas', 'A diagnostic tool for assessing and monitoring financial health', 'accounting_management', 'document', 'Accounting_Financial_Health_Canvas.docx', '/templates/Accounting_Financial_Health_Canvas.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  
  -- Marketing
  ('Marketing Options Available Canvas', 'A canvas for exploring and evaluating marketing options and channels', 'marketing', 'document', 'Marketing_Options_Available_Canvas.docx', '/templates/Marketing_Options_Available_Canvas.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  ('Marketing Strategy', 'Comprehensive marketing strategy planning document', 'marketing', 'document', 'Marketing_Strategy.docx', '/templates/Marketing_Strategy.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  
  -- Team Management
  ('Team Performance Canvas', 'A canvas for tracking and improving team performance metrics', 'team_management', 'document', 'Team_Performance_Canvas.docx', '/templates/Team_Performance_Canvas.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true),
  ('Team Capability Skills Canvas', 'A skills assessment and development canvas for team capabilities', 'team_management', 'document', 'Team_Capability_Skills_Canvas.docx', '/templates/Team_Capability_Skills_Canvas.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true);