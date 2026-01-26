-- Create a table for file-level permissions
CREATE TABLE public.data_room_file_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (file_id, user_id)
);

-- Add is_restricted column to data_room_files (default false - no restrictions)
ALTER TABLE public.data_room_files 
ADD COLUMN IF NOT EXISTS is_restricted boolean DEFAULT false NOT NULL;

-- Enable RLS on the new table
ALTER TABLE public.data_room_file_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for file permissions table

-- Users can view file permissions if they can access the data room
CREATE POLICY "Users can view file permissions in accessible data rooms"
ON public.data_room_file_permissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.data_room_files f
        WHERE f.id = file_id
        AND public.user_can_access_data_room(f.data_room_id)
    )
);

-- Only file owner or admin can insert file permissions
CREATE POLICY "File owners can insert file permissions"
ON public.data_room_file_permissions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.data_room_files f
        WHERE f.id = file_id
        AND (f.uploaded_by = auth.uid() OR public.has_role(auth.uid(), f.organization_id, 'admin'::app_role))
    )
);

-- Only file owner or admin can update file permissions
CREATE POLICY "File owners can update file permissions"
ON public.data_room_file_permissions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.data_room_files f
        WHERE f.id = file_id
        AND (f.uploaded_by = auth.uid() OR public.has_role(auth.uid(), f.organization_id, 'admin'::app_role))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.data_room_files f
        WHERE f.id = file_id
        AND (f.uploaded_by = auth.uid() OR public.has_role(auth.uid(), f.organization_id, 'admin'::app_role))
    )
);

-- Only file owner or admin can delete file permissions
CREATE POLICY "File owners can delete file permissions"
ON public.data_room_file_permissions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.data_room_files f
        WHERE f.id = file_id
        AND (f.uploaded_by = auth.uid() OR public.has_role(auth.uid(), f.organization_id, 'admin'::app_role))
    )
);

-- Create index for faster lookups
CREATE INDEX idx_file_permissions_file_id ON public.data_room_file_permissions(file_id);
CREATE INDEX idx_file_permissions_user_id ON public.data_room_file_permissions(user_id);