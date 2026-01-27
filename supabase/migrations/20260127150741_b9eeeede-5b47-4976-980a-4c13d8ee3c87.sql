-- =========================================================
-- Fix missing tables used by the UI: task_attachments + task_urls
-- Tighten storage policies for task-attachments bucket
-- Align user_id FKs to public.profiles (avoid auth.users FKs)
-- =========================================================

-- ---------------------------------
-- 1) Storage policies (tighten)
-- ---------------------------------
-- Recreate policies to ensure org-scoped access based on folder name: <org_id>/...
DROP POLICY IF EXISTS "Users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task attachments in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task attachments" ON storage.objects;

CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can view task attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can update task attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can delete task attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- ---------------------------------
-- 2) task_attachments table
-- ---------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task attachments in their organization" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can add task attachments in their organization" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can delete their own task attachments" ON public.task_attachments;

CREATE POLICY "Users can view task attachments in their organization"
ON public.task_attachments FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can add task attachments in their organization"
ON public.task_attachments FOR INSERT
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Users can delete their own task attachments"
ON public.task_attachments FOR DELETE
USING (
  public.is_org_member(auth.uid(), organization_id)
  AND uploaded_by = auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_org_id ON public.task_attachments(organization_id);

-- ---------------------------------
-- 3) task_urls table
-- ---------------------------------
CREATE TABLE IF NOT EXISTS public.task_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task urls in their organization" ON public.task_urls;
DROP POLICY IF EXISTS "Users can add task urls in their organization" ON public.task_urls;
DROP POLICY IF EXISTS "Users can delete their own task urls" ON public.task_urls;

CREATE POLICY "Users can view task urls in their organization"
ON public.task_urls FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can add task urls in their organization"
ON public.task_urls FOR INSERT
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
  AND created_by = auth.uid()
);

CREATE POLICY "Users can delete their own task urls"
ON public.task_urls FOR DELETE
USING (
  public.is_org_member(auth.uid(), organization_id)
  AND created_by = auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_task_urls_task_id ON public.task_urls(task_id);
CREATE INDEX IF NOT EXISTS idx_task_urls_org_id ON public.task_urls(organization_id);

-- Enable realtime for task_notes/task_urls/task_attachments (safe if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_urls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;

-- ---------------------------------
-- 4) Align user_id foreign keys to public.profiles (avoid auth.users FKs)
-- ---------------------------------
-- personal_checklist_items.user_id
ALTER TABLE public.personal_checklist_items
  DROP CONSTRAINT IF EXISTS personal_checklist_items_user_id_fkey;
ALTER TABLE public.personal_checklist_items
  ADD CONSTRAINT personal_checklist_items_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- projects.user_id
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- task_notes.user_id
ALTER TABLE public.task_notes
  DROP CONSTRAINT IF EXISTS task_notes_user_id_fkey;
ALTER TABLE public.task_notes
  ADD CONSTRAINT task_notes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
