-- Add new columns to drive_files table for permissions and document type
ALTER TABLE public.drive_files 
ADD COLUMN IF NOT EXISTS file_category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create an index for faster filtering by file_category
CREATE INDEX IF NOT EXISTS idx_drive_files_file_category ON public.drive_files(file_category);
CREATE INDEX IF NOT EXISTS idx_drive_files_is_restricted ON public.drive_files(is_restricted);

-- Create a table to store file access grants for restricted files
CREATE TABLE IF NOT EXISTS public.drive_file_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  granted_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(file_id, granted_to)
);

-- Enable RLS on drive_file_access
ALTER TABLE public.drive_file_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for drive_file_access
CREATE POLICY "Users can view access grants for files they own or have access to"
ON public.drive_file_access
FOR SELECT
USING (
  granted_by = auth.uid() 
  OR granted_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.drive_files df 
    WHERE df.id = file_id AND df.uploaded_by = auth.uid()
  )
);

CREATE POLICY "File owners can grant access"
ON public.drive_file_access
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.drive_files df 
    WHERE df.id = file_id AND df.uploaded_by = auth.uid()
  )
);

CREATE POLICY "File owners can revoke access"
ON public.drive_file_access
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.drive_files df 
    WHERE df.id = file_id AND df.uploaded_by = auth.uid()
  )
);

-- Drop and recreate the SELECT policy on drive_files to handle restricted files
DROP POLICY IF EXISTS "Users can view files in their organization" ON public.drive_files;

CREATE POLICY "Users can view files in their organization with restrictions"
ON public.drive_files
FOR SELECT
USING (
  is_org_member(auth.uid(), organization_id) 
  AND (
    -- Non-restricted files are visible to everyone in org
    is_restricted = false
    -- Restricted files visible to uploader
    OR uploaded_by = auth.uid()
    -- Restricted files visible to assigned users
    OR assigned_to = auth.uid()
    -- Restricted files visible if user has been granted access
    OR EXISTS (
      SELECT 1 FROM public.drive_file_access dfa 
      WHERE dfa.file_id = drive_files.id AND dfa.granted_to = auth.uid()
    )
  )
);