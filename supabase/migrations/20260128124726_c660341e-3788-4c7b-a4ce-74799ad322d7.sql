-- Create data_rooms table
CREATE TABLE public.data_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  nda_required BOOLEAN NOT NULL DEFAULT false,
  nda_content TEXT,
  nda_content_hash TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.data_rooms ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_data_rooms_organization ON public.data_rooms(organization_id);
CREATE INDEX idx_data_rooms_created_by ON public.data_rooms(created_by);
CREATE INDEX idx_data_rooms_deleted_at ON public.data_rooms(deleted_at);
CREATE INDEX idx_data_rooms_status_deleted ON public.data_rooms(status, deleted_at);

-- RLS Policies
CREATE POLICY "Users can view data rooms in their organization" ON public.data_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = auth.uid() 
    AND public.user_roles.organization_id = data_rooms.organization_id
  )
);

CREATE POLICY "Users can create data rooms in their organization" ON public.data_rooms 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = auth.uid() 
    AND public.user_roles.organization_id = organization_id
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Admins or creator can update data rooms" ON public.data_rooms
FOR UPDATE
USING (
  public.is_org_admin(auth.uid(), organization_id) OR created_by = auth.uid()
)
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id) OR created_by = auth.uid()
);

CREATE POLICY "Admins or creator can delete data rooms" ON public.data_rooms
FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id) OR created_by = auth.uid()
);

-- Create data_room_files table
CREATE TABLE public.data_room_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id UUID,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_room_files ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_data_room_files_data_room ON public.data_room_files(data_room_id);
CREATE INDEX idx_data_room_files_folder ON public.data_room_files(folder_id);

-- Create data_room_folders table
CREATE TABLE public.data_room_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.data_room_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_room_folders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_data_room_folders_data_room ON public.data_room_folders(data_room_id);
CREATE INDEX idx_data_room_folders_parent ON public.data_room_folders(parent_id);

-- Add folder_id FK to files after folders table exists
ALTER TABLE public.data_room_files 
ADD CONSTRAINT data_room_files_folder_id_fkey 
FOREIGN KEY (folder_id) REFERENCES public.data_room_folders(id) ON DELETE SET NULL;

-- Create data_room_invites table
CREATE TABLE public.data_room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  access_id TEXT UNIQUE,
  guest_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.data_room_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_data_room_invites_data_room ON public.data_room_invites(data_room_id);
CREATE INDEX idx_data_room_invites_email ON public.data_room_invites(email);

-- Create data_room_nda_signatures table
CREATE TABLE public.data_room_nda_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  nda_content_hash TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT
);

ALTER TABLE public.data_room_nda_signatures ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_data_room_nda_signatures_data_room ON public.data_room_nda_signatures(data_room_id);
CREATE INDEX idx_data_room_nda_signatures_user ON public.data_room_nda_signatures(user_id);

-- Create storage bucket for data room files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('data-room-files', 'data-room-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for data room files
CREATE POLICY "Org members can upload data room files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'data-room-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Org members can view data room files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'data-room-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Org members can delete data room files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'data-room-files' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id::text = (storage.foldername(name))[1]
  )
);