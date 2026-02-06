-- Storage policies for project-attachments bucket with unique names
CREATE POLICY "Project attachments: view files in org folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-attachments' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Project attachments: upload files to org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-attachments' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Project attachments: delete files in org folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-attachments' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);