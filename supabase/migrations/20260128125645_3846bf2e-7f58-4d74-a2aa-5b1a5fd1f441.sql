-- Add missing columns to data_room_folders
ALTER TABLE public.data_room_folders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to data_room_files
ALTER TABLE public.data_room_files 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false;

-- Add missing column to data_room_invites
ALTER TABLE public.data_room_invites 
ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create data_room_members table for internal team members
CREATE TABLE IF NOT EXISTS public.data_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(data_room_id, user_id)
);

-- Enable RLS on data_room_members
ALTER TABLE public.data_room_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_room_members
CREATE POLICY "Org members can view data room members"
ON public.data_room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_rooms dr
    JOIN public.user_roles ur ON ur.organization_id = dr.organization_id
    WHERE dr.id = data_room_members.data_room_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Data room creator can manage members"
ON public.data_room_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.data_rooms dr
    WHERE dr.id = data_room_members.data_room_id
    AND dr.created_by = auth.uid()
  )
);

-- Create data_room_folder_permissions table
CREATE TABLE IF NOT EXISTS public.data_room_folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.data_room_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(folder_id, user_id)
);

-- Enable RLS on data_room_folder_permissions
ALTER TABLE public.data_room_folder_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_room_folder_permissions
CREATE POLICY "Users can view their own folder permissions"
ON public.data_room_folder_permissions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Folder creator can manage permissions"
ON public.data_room_folder_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_folders f
    WHERE f.id = data_room_folder_permissions.folder_id
    AND f.created_by = auth.uid()
  )
);

-- Create data_room_file_permissions table
CREATE TABLE IF NOT EXISTS public.data_room_file_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(file_id, user_id)
);

-- Enable RLS on data_room_file_permissions
ALTER TABLE public.data_room_file_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_room_file_permissions
CREATE POLICY "Users can view their own file permissions"
ON public.data_room_file_permissions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "File uploader can manage permissions"
ON public.data_room_file_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_files f
    WHERE f.id = data_room_file_permissions.file_id
    AND f.uploaded_by = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_room_folders_deleted_at ON public.data_room_folders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_data_room_files_deleted_at ON public.data_room_files(deleted_at);
CREATE INDEX IF NOT EXISTS idx_data_room_members_data_room_id ON public.data_room_members(data_room_id);
CREATE INDEX IF NOT EXISTS idx_data_room_folder_permissions_folder_id ON public.data_room_folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_data_room_file_permissions_file_id ON public.data_room_file_permissions(file_id);