-- =============================================
-- 1. Create task-attachments storage bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for task-attachments bucket
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view task attachments in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own task attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
);

-- =============================================
-- 2. Create personal_checklist_items table
-- =============================================
CREATE TABLE IF NOT EXISTS public.personal_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  time_group TEXT NOT NULL DEFAULT 'this_month',
  position INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  project_id UUID,
  icon TEXT NOT NULL DEFAULT 'ListTodo',
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for personal_checklist_items
CREATE POLICY "Users can view their own checklist items"
ON public.personal_checklist_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklist items"
ON public.personal_checklist_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklist items"
ON public.personal_checklist_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklist items"
ON public.personal_checklist_items FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_personal_checklist_items_user_id ON public.personal_checklist_items(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_personal_checklist_items_updated_at
  BEFORE UPDATE ON public.personal_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. Create projects table
-- =============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  position INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view projects in their organization"
ON public.projects FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create projects in their organization"
ON public.projects FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update projects in their organization"
ON public.projects FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete projects in their organization"
ON public.projects FOR DELETE
USING (is_org_member(auth.uid(), organization_id));

-- Indexes for faster queries
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key from tasks to projects
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- =============================================
-- 4. Create task_notes table
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_notes
CREATE POLICY "Users can view notes for tasks in their organization"
ON public.task_notes FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create notes for tasks in their organization"
ON public.task_notes FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their own notes"
ON public.task_notes FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX idx_task_notes_task_id ON public.task_notes(task_id);
CREATE INDEX idx_task_notes_organization_id ON public.task_notes(organization_id);

-- Enable realtime for personal_checklist_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_checklist_items;

-- Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;