-- Create Data Room Document Content table
CREATE TABLE IF NOT EXISTS public.data_room_document_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL UNIQUE REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'rich_text',
  last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create Data Room Document Versions table
CREATE TABLE IF NOT EXISTS public.data_room_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.data_room_document_content(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create Data Room Document Presence table
CREATE TABLE IF NOT EXISTS public.data_room_document_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_position INTEGER,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(file_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_room_document_content_file_id ON public.data_room_document_content(file_id);
CREATE INDEX IF NOT EXISTS idx_data_room_document_content_data_room_id ON public.data_room_document_content(data_room_id);
CREATE INDEX IF NOT EXISTS idx_data_room_document_versions_document_id ON public.data_room_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_data_room_document_versions_file_id ON public.data_room_document_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_data_room_document_presence_file_id ON public.data_room_document_presence(file_id);

-- Enable RLS
ALTER TABLE public.data_room_document_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_presence ENABLE ROW LEVEL SECURITY;

-- RLS for data_room_document_content
CREATE POLICY "Users can view data room document content"
ON public.data_room_document_content
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  OR EXISTS (
    SELECT 1 FROM data_room_members
    WHERE data_room_members.data_room_id = data_room_document_content.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create data room document content"
ON public.data_room_document_content
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Users can update data room document content"
ON public.data_room_document_content
FOR UPDATE
USING (
  is_org_member(auth.uid(), organization_id)
);

-- RLS for data_room_document_versions
CREATE POLICY "Users can view data room document versions"
ON public.data_room_document_versions
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id)
  OR EXISTS (
    SELECT 1 FROM data_room_members
    WHERE data_room_members.data_room_id = data_room_document_versions.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create data room document versions"
ON public.data_room_document_versions
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
);

-- RLS for data_room_document_presence
CREATE POLICY "Users can view document presence"
ON public.data_room_document_presence
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own presence"
ON public.data_room_document_presence
FOR ALL
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_data_room_document_content_updated_at
BEFORE UPDATE ON public.data_room_document_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();