-- Create project_attachments table similar to task_attachments
CREATE TABLE public.project_attachments (
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

-- Users can insert attachments for projects in their organization (non-viewers)
CREATE POLICY "Non-viewers can insert project attachments"
ON public.project_attachments
FOR INSERT
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
  AND NOT public.is_viewer(auth.uid(), organization_id)
);

-- Users can delete attachments they uploaded or if they're admin
CREATE POLICY "Users can delete own project attachments or admin can delete any"
ON public.project_attachments
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR public.is_admin(auth.uid(), organization_id)
);

-- Create storage policies for project-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-attachments bucket
CREATE POLICY "Users can view project attachments in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-attachments' 
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Non-viewers can upload project attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-attachments'
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  AND NOT public.is_viewer(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can delete their own project attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-attachments'
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);