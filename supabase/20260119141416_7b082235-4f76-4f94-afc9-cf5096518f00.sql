-- Create data room document content table for storing editable document content
CREATE TABLE public.data_room_document_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'rich_text',
  last_edited_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT data_room_document_content_file_id_key UNIQUE (file_id)
);

-- Create data room document versions table for version history
CREATE TABLE public.data_room_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.data_room_document_content(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  version_note text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create data room document presence table for real-time collaboration
CREATE TABLE public.data_room_document_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cursor_position integer,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT data_room_document_presence_file_user_key UNIQUE (file_id, user_id)
);

-- Enable RLS
ALTER TABLE public.data_room_document_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_room_document_content
-- Users can view content if they are a member of the data room or owner
CREATE POLICY "Users can view data room document content"
ON public.data_room_document_content
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_members 
    WHERE data_room_id = data_room_document_content.data_room_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms 
    WHERE id = data_room_document_content.data_room_id 
    AND created_by = auth.uid()
  )
);

-- Users can insert content if they are a member or owner
CREATE POLICY "Users can create data room document content"
ON public.data_room_document_content
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_room_members 
    WHERE data_room_id = data_room_document_content.data_room_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms 
    WHERE id = data_room_document_content.data_room_id 
    AND created_by = auth.uid()
  )
);

-- Users can update content if they are a member or owner
CREATE POLICY "Users can update data room document content"
ON public.data_room_document_content
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_members 
    WHERE data_room_id = data_room_document_content.data_room_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms 
    WHERE id = data_room_document_content.data_room_id 
    AND created_by = auth.uid()
  )
);

-- RLS policies for data_room_document_versions
CREATE POLICY "Users can view data room document versions"
ON public.data_room_document_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_members 
    WHERE data_room_id = data_room_document_versions.data_room_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms 
    WHERE id = data_room_document_versions.data_room_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can create data room document versions"
ON public.data_room_document_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_room_members 
    WHERE data_room_id = data_room_document_versions.data_room_id 
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms 
    WHERE id = data_room_document_versions.data_room_id 
    AND created_by = auth.uid()
  )
);

-- RLS policies for data_room_document_presence
CREATE POLICY "Users can view data room document presence"
ON public.data_room_document_presence
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own presence"
ON public.data_room_document_presence
FOR ALL
USING (user_id = auth.uid());

-- Enable realtime for document content
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_document_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_document_presence;

-- Create indexes for performance
CREATE INDEX idx_data_room_document_content_file_id ON public.data_room_document_content(file_id);
CREATE INDEX idx_data_room_document_content_data_room_id ON public.data_room_document_content(data_room_id);
CREATE INDEX idx_data_room_document_versions_document_id ON public.data_room_document_versions(document_id);
CREATE INDEX idx_data_room_document_versions_file_id ON public.data_room_document_versions(file_id);
CREATE INDEX idx_data_room_document_presence_file_id ON public.data_room_document_presence(file_id);