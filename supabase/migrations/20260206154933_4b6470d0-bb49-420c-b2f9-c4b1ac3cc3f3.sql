-- Create project_attachments table
CREATE TABLE IF NOT EXISTS public.project_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for project attachments
-- Users can view attachments for projects in their organization
CREATE POLICY "Users can view project attachments in their organization"
ON public.project_attachments
FOR SELECT
USING (
  public.is_org_member(auth.uid(), organization_id)
);

-- Non-viewer members can insert attachments (admins and moderators only)
CREATE POLICY "Non-viewers can insert project attachments"
ON public.project_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = project_attachments.organization_id
    AND ur.role IN ('admin', 'moderator')
  )
);

-- Users can delete attachments they uploaded or if they're admin
CREATE POLICY "Users can delete own project attachments or admin can delete any"
ON public.project_attachments
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR public.is_org_admin(auth.uid(), organization_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON public.project_attachments(project_id);