-- Create task_notes table for managers/owners to add notes to tasks
CREATE TABLE public.task_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for task notes
-- Users can view notes for tasks in their organization
CREATE POLICY "Users can view task notes in their organization"
ON public.task_notes
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Only admins and members (managers) can create notes
CREATE POLICY "Admins and members can create task notes"
ON public.task_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND organization_id = task_notes.organization_id
    AND role IN ('admin', 'member')
  )
);

-- Only the note creator can update their notes
CREATE POLICY "Users can update their own notes"
ON public.task_notes
FOR UPDATE
USING (user_id = auth.uid());

-- Only the note creator or admins can delete notes
CREATE POLICY "Users can delete their own notes or admins can delete any"
ON public.task_notes
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND organization_id = task_notes.organization_id
    AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_task_notes_task_id ON public.task_notes(task_id);
CREATE INDEX idx_task_notes_organization_id ON public.task_notes(organization_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_task_notes_updated_at
BEFORE UPDATE ON public.task_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();