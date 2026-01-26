-- Enforce NDA signing before accessing ANY data room content (files/folders/chat/activity/comments)

-- Helper: determine whether the current authenticated user may access a given data room.
-- Rules:
-- 1) Owner always has access
-- 2) Internal member must exist in data_room_members
-- 3) If NDA is required, user must have a signature row (user_id = auth.uid())
CREATE OR REPLACE FUNCTION public.user_can_access_data_room(p_data_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nda_required boolean;
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT dr.nda_required, dr.created_by
    INTO v_nda_required, v_owner
  FROM public.data_rooms dr
  WHERE dr.id = p_data_room_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Owner always has access
  IF v_owner = auth.uid() THEN
    RETURN true;
  END IF;

  -- Must be an internal member
  IF NOT EXISTS (
    SELECT 1
    FROM public.data_room_members m
    WHERE m.data_room_id = p_data_room_id
      AND m.user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  -- If NDA isn't required, membership is enough
  IF v_nda_required IS NOT TRUE THEN
    RETURN true;
  END IF;

  -- NDA required: signature must exist
  RETURN EXISTS (
    SELECT 1
    FROM public.data_room_nda_signatures s
    WHERE s.data_room_id = p_data_room_id
      AND s.user_id = auth.uid()
  );
END;
$$;

-- Drop existing overly-broad policies on content tables (policies are OR'ed, so we must remove the permissive ones).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'data_room_files',
        'data_room_folders',
        'data_room_messages',
        'data_room_activity',
        'data_room_file_comments'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- =========================
-- Files
-- =========================
CREATE POLICY "Users can view files in accessible data rooms"
ON public.data_room_files
FOR SELECT
USING (public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users can upload files in accessible data rooms"
ON public.data_room_files
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Admins or uploader can update files in accessible data rooms"
ON public.data_room_files
FOR UPDATE
USING (
  public.user_can_access_data_room(data_room_id)
  AND (public.has_role(auth.uid(), organization_id, 'admin'::app_role) OR uploaded_by = auth.uid())
)
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND (public.has_role(auth.uid(), organization_id, 'admin'::app_role) OR uploaded_by = auth.uid())
);

CREATE POLICY "Admins or uploader can delete files in accessible data rooms"
ON public.data_room_files
FOR DELETE
USING (
  public.user_can_access_data_room(data_room_id)
  AND (public.has_role(auth.uid(), organization_id, 'admin'::app_role) OR uploaded_by = auth.uid())
);

-- =========================
-- Folders
-- =========================
CREATE POLICY "Users can view folders in accessible data rooms"
ON public.data_room_folders
FOR SELECT
USING (public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users can create folders in accessible data rooms"
ON public.data_room_folders
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Admins or creator can update folders in accessible data rooms"
ON public.data_room_folders
FOR UPDATE
USING (
  public.user_can_access_data_room(data_room_id)
  AND (public.has_role(auth.uid(), organization_id, 'admin'::app_role) OR created_by = auth.uid())
)
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND (public.has_role(auth.uid(), organization_id, 'admin'::app_role) OR created_by = auth.uid())
);

CREATE POLICY "Admins or creator can delete folders in accessible data rooms"
ON public.data_room_folders
FOR DELETE
USING (
  public.user_can_access_data_room(data_room_id)
  AND (public.has_role(auth.uid(), organization_id, 'admin'::app_role) OR created_by = auth.uid())
);

-- =========================
-- Messages (internal authenticated users)
-- =========================
CREATE POLICY "Users can view messages in accessible data rooms"
ON public.data_room_messages
FOR SELECT
USING (public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users can send messages in accessible data rooms"
ON public.data_room_messages
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND sender_id = auth.uid()
);

-- =========================
-- File comments (internal authenticated users)
-- =========================
CREATE POLICY "Users can view comments in accessible data rooms"
ON public.data_room_file_comments
FOR SELECT
USING (public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users can add comments in accessible data rooms"
ON public.data_room_file_comments
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND commenter_id = auth.uid()
);

-- =========================
-- Activity (internal authenticated users)
-- =========================
CREATE POLICY "Users can view activity in accessible data rooms"
ON public.data_room_activity
FOR SELECT
USING (public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users can log activity in accessible data rooms"
ON public.data_room_activity
FOR INSERT
WITH CHECK (
  public.user_can_access_data_room(data_room_id)
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);
