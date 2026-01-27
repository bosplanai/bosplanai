-- Create drive_folders table
CREATE TABLE IF NOT EXISTS public.drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.drive_folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drive_files table
CREATE TABLE IF NOT EXISTS public.drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.drive_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'not_opened',
  version INTEGER NOT NULL DEFAULT 1,
  assigned_to UUID REFERENCES public.profiles(id),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  parent_file_id UUID REFERENCES public.drive_files(id),
  description TEXT,
  file_category TEXT DEFAULT 'general',
  is_restricted BOOLEAN DEFAULT false,
  requires_signature BOOLEAN DEFAULT false,
  signature_status TEXT,
  signed_by UUID REFERENCES public.profiles(id),
  signed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drive_folders
CREATE POLICY "Users can view folders in their organization" 
ON public.drive_folders 
FOR SELECT 
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create folders in their organization" 
ON public.drive_folders 
FOR INSERT 
WITH CHECK (is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

CREATE POLICY "Users can update folders in their organization" 
ON public.drive_folders 
FOR UPDATE 
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their own folders" 
ON public.drive_folders 
FOR DELETE 
USING (is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

-- Create RLS policies for drive_files
CREATE POLICY "Users can view files in their organization" 
ON public.drive_files 
FOR SELECT 
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create files in their organization" 
ON public.drive_files 
FOR INSERT 
WITH CHECK (is_org_member(auth.uid(), organization_id) AND uploaded_by = auth.uid());

CREATE POLICY "Users can update files in their organization" 
ON public.drive_files 
FOR UPDATE 
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their own files" 
ON public.drive_files 
FOR DELETE 
USING (is_org_member(auth.uid(), organization_id) AND uploaded_by = auth.uid());

-- Create updated_at trigger for drive_files
CREATE TRIGGER update_drive_files_updated_at
BEFORE UPDATE ON public.drive_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_drive_folders_organization_id ON public.drive_folders(organization_id);
CREATE INDEX idx_drive_folders_parent_id ON public.drive_folders(parent_id);
CREATE INDEX idx_drive_files_organization_id ON public.drive_files(organization_id);
CREATE INDEX idx_drive_files_folder_id ON public.drive_files(folder_id);
CREATE INDEX idx_drive_files_uploaded_by ON public.drive_files(uploaded_by);
CREATE INDEX idx_drive_files_deleted_at ON public.drive_files(deleted_at);

-- Create storage bucket for drive files
INSERT INTO storage.buckets (id, name, public)
VALUES ('drive-files', 'drive-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for drive-files bucket
CREATE POLICY "Users can view files in their organization folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (storage.foldername(name))[1] = p.organization_id::text
  )
);

CREATE POLICY "Users can upload files to their organization folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (storage.foldername(name))[1] = p.organization_id::text
  )
);

CREATE POLICY "Users can delete files in their organization folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'drive-files' AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (storage.foldername(name))[1] = p.organization_id::text
  )
);