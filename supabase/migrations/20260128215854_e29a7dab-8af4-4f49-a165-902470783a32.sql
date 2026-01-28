-- Create table for document content (supports both rich text docs and plain text editing)
CREATE TABLE public.drive_document_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'rich_text' CHECK (content_type IN ('rich_text', 'plain_text')),
  last_edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(file_id)
);

-- Enable RLS
ALTER TABLE public.drive_document_content ENABLE ROW LEVEL SECURITY;

-- RLS policies matching drive_files permissions
CREATE POLICY "Users can view document content for files they can access"
ON public.drive_document_content
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

CREATE POLICY "Users can insert document content for files they can access"
ON public.drive_document_content
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

CREATE POLICY "Users can update document content for files they can access"
ON public.drive_document_content
FOR UPDATE
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

CREATE POLICY "Users can delete document content for files they can access"
ON public.drive_document_content
FOR DELETE
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

-- Trigger for updated_at
CREATE TRIGGER update_drive_document_content_updated_at
BEFORE UPDATE ON public.drive_document_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_document_content;

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
CREATE INDEX idx_drive_document_versions_document_id ON public.drive_document_versions(document_id);
CREATE INDEX idx_drive_document_versions_file_id ON public.drive_document_versions(file_id);

-- Enable realtime for version updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_document_versions;

-- Create table to track active collaborators on a document
CREATE TABLE public.drive_document_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_position INTEGER DEFAULT 0,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(file_id, user_id)
);

-- Enable RLS
ALTER TABLE public.drive_document_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for presence
CREATE POLICY "Users can view presence for files they can access"
ON public.drive_document_presence
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

CREATE POLICY "Users can manage their own presence"
ON public.drive_document_presence
FOR ALL
USING (user_id = auth.uid());

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_document_presence;

-- Create indexes for faster queries
CREATE INDEX idx_drive_document_content_file_id ON public.drive_document_content(file_id);
CREATE INDEX idx_drive_document_presence_file_id ON public.drive_document_presence(file_id);