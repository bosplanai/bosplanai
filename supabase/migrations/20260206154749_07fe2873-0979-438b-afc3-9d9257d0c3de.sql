-- Create project-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Drop any existing conflicting policies (if they exist from partial migration)
DROP POLICY IF EXISTS "Users can view project attachments in their org" ON storage.objects;
DROP POLICY IF EXISTS "Non-viewers can upload project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Project attachments: view files in org folder" ON storage.objects;
DROP POLICY IF EXISTS "Project attachments: upload files to org folder" ON storage.objects;
DROP POLICY IF EXISTS "Project attachments: delete files in org folder" ON storage.objects;

-- Create RLS policies for project-attachments bucket with unique names
CREATE POLICY "project_attachments_select_policy"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "project_attachments_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
    AND ur.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "project_attachments_delete_policy"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);