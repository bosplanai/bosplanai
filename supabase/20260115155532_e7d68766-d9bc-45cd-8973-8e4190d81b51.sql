-- Add tables for Data Room chat, comments, activity, and internal members

-- Data Room Members table (for internal team members)
CREATE TABLE public.data_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(data_room_id, user_id)
);

-- Data Room Messages table (for chat)
CREATE TABLE public.data_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data Room File Comments table
CREATE TABLE public.data_room_file_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  commenter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data Room Activity Log table
CREATE TABLE public.data_room_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add access_id column to invites for guest access
ALTER TABLE public.data_room_invites 
ADD COLUMN IF NOT EXISTS access_id TEXT UNIQUE;

-- Add guest_name column to invites
ALTER TABLE public.data_room_invites 
ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- Enable RLS
ALTER TABLE public.data_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_file_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_room_members
CREATE POLICY "Org members can view data room members"
ON public.data_room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = data_room_members.organization_id
  )
);

CREATE POLICY "Admins can manage data room members"
ON public.data_room_members
FOR ALL
USING (
  public.is_admin(auth.uid(), organization_id)
);

-- RLS Policies for data_room_messages
CREATE POLICY "Data room members can view messages"
ON public.data_room_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_members
    WHERE data_room_members.data_room_id = data_room_messages.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_messages.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

CREATE POLICY "Data room members can send messages"
ON public.data_room_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_room_members
    WHERE data_room_members.data_room_id = data_room_messages.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_messages.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

-- RLS Policies for data_room_file_comments
CREATE POLICY "Data room members can view comments"
ON public.data_room_file_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_members
    WHERE data_room_members.data_room_id = data_room_file_comments.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_file_comments.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

CREATE POLICY "Data room members can add comments"
ON public.data_room_file_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_room_members
    WHERE data_room_members.data_room_id = data_room_file_comments.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_file_comments.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

-- RLS Policies for data_room_activity
CREATE POLICY "Data room members can view activity"
ON public.data_room_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.data_room_members
    WHERE data_room_members.data_room_id = data_room_activity.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_activity.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

CREATE POLICY "Data room members can log activity"
ON public.data_room_activity
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_room_members
    WHERE data_room_members.data_room_id = data_room_activity.data_room_id
    AND data_room_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.data_rooms
    WHERE data_rooms.id = data_room_activity.data_room_id
    AND data_rooms.created_by = auth.uid()
  )
);

-- Function to generate unique access ID
CREATE OR REPLACE FUNCTION public.generate_access_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric ID
    new_id := upper(substring(md5(random()::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM data_room_invites WHERE access_id = new_id) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

-- Trigger to auto-generate access_id for invites
CREATE OR REPLACE FUNCTION public.set_invite_access_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_id IS NULL THEN
    NEW.access_id := generate_access_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_invite_access_id
BEFORE INSERT ON public.data_room_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_invite_access_id();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_room_messages;

-- Create indexes for performance
CREATE INDEX idx_data_room_members_data_room ON public.data_room_members(data_room_id);
CREATE INDEX idx_data_room_members_user ON public.data_room_members(user_id);
CREATE INDEX idx_data_room_messages_data_room ON public.data_room_messages(data_room_id);
CREATE INDEX idx_data_room_messages_created ON public.data_room_messages(created_at DESC);
CREATE INDEX idx_data_room_file_comments_file ON public.data_room_file_comments(file_id);
CREATE INDEX idx_data_room_activity_data_room ON public.data_room_activity(data_room_id);
CREATE INDEX idx_data_room_activity_created ON public.data_room_activity(created_at DESC);