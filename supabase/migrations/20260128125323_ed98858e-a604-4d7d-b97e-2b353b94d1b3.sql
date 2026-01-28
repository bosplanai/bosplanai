-- RLS Policies for data_room_files
CREATE POLICY "Users can view files in accessible data rooms"
ON public.data_room_files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.organization_id = data_room_files.organization_id
  )
);

CREATE POLICY "Users can upload files in accessible data rooms"
ON public.data_room_files
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.organization_id = data_room_files.organization_id
  )
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Admins or uploader can update files"
ON public.data_room_files
FOR UPDATE
USING (
  is_org_admin(auth.uid(), organization_id) OR uploaded_by = auth.uid()
);

CREATE POLICY "Admins or uploader can delete files"
ON public.data_room_files
FOR DELETE
USING (
  is_org_admin(auth.uid(), organization_id) OR uploaded_by = auth.uid()
);

-- RLS Policies for data_room_folders
CREATE POLICY "Users can view folders in accessible data rooms"
ON public.data_room_folders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.organization_id = data_room_folders.organization_id
  )
);

CREATE POLICY "Users can create folders in accessible data rooms"
ON public.data_room_folders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.organization_id = data_room_folders.organization_id
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Admins or creator can update folders"
ON public.data_room_folders
FOR UPDATE
USING (
  is_org_admin(auth.uid(), organization_id) OR created_by = auth.uid()
);

CREATE POLICY "Admins or creator can delete folders"
ON public.data_room_folders
FOR DELETE
USING (
  is_org_admin(auth.uid(), organization_id) OR created_by = auth.uid()
);

-- RLS Policies for data_room_invites
CREATE POLICY "Org members can view invites"
ON public.data_room_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.organization_id = data_room_invites.organization_id
  )
);

CREATE POLICY "Org members can create invites"
ON public.data_room_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.organization_id = data_room_invites.organization_id
  )
);

CREATE POLICY "Org admins can update invites"
ON public.data_room_invites
FOR UPDATE
USING (
  is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "Org admins can delete invites"
ON public.data_room_invites
FOR DELETE
USING (
  is_org_admin(auth.uid(), organization_id)
);

-- RLS Policies for data_room_nda_signatures
CREATE POLICY "Org members can view NDA signatures"
ON public.data_room_nda_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_rooms dr
    JOIN public.user_roles ur ON ur.organization_id = dr.organization_id
    WHERE dr.id = data_room_nda_signatures.data_room_id
    AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can sign NDAs"
ON public.data_room_nda_signatures
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);