-- Create table to store task URLs
CREATE TABLE public.task_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_urls ENABLE ROW LEVEL SECURITY;

-- Policies for task_urls
CREATE POLICY "Org members can view task URLs"
ON public.task_urls
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins and members can insert task URLs"
ON public.task_urls
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND NOT is_viewer(auth.uid(), organization_id));

CREATE POLICY "Uploaders or admins can delete task URLs"
ON public.task_urls
FOR DELETE
USING ((created_by = auth.uid()) OR is_admin(auth.uid(), organization_id));