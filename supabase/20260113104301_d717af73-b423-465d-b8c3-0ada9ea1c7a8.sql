-- Create table for document content versions/history
CREATE TABLE public.drive_document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.drive_document_content(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_note TEXT
);

-- Enable RLS
ALTER TABLE public.drive_document_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies matching drive_files permissions
CREATE POLICY "Users can view document versions for files they can access"
ON public.drive_document_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drive_files df
    WHERE df.id = file_id
    AND (
      df.organization_id IN (
        SELECT ur.organization_id FROM user_roles ur WHERE ur.user_id = auth.uid()
      )
      OR df.assigned_to = auth.uid()
      OR df.uploaded_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert document versions for files they can access"
ON public.drive_document_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.drive_files df
    WHERE df.id = file_id
    AND (
      df.organization_id IN (
        SELECT ur.organization_id FROM user_roles ur WHERE ur.user_id = auth.uid()
      )
      OR df.assigned_to = auth.uid()
      OR df.uploaded_by = auth.uid()
    )
  )
);

-- Index for faster lookups
CREATE INDEX idx_document_versions_document_id ON public.drive_document_versions(document_id);
CREATE INDEX idx_document_versions_file_id ON public.drive_document_versions(file_id);

-- Enable realtime for version updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_document_versions;