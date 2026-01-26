-- Create table for task merge audit logs
CREATE TABLE public.task_merge_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    merge_type TEXT NOT NULL CHECK (merge_type IN ('permanent', 'temporary')),
    temporary_end_date DATE,
    tasks_transferred JSONB NOT NULL DEFAULT '[]',
    task_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    reverted_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending_revert', 'reverted'))
);

-- Enable RLS
ALTER TABLE public.task_merge_logs ENABLE ROW LEVEL SECURITY;

-- Admins can insert merge logs
CREATE POLICY "Admins can insert merge logs"
ON public.task_merge_logs
FOR INSERT
WITH CHECK (is_admin(auth.uid(), organization_id));

-- Admins can view merge logs in their organization
CREATE POLICY "Admins can view merge logs"
ON public.task_merge_logs
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Admins can update merge logs (for marking as reverted)
CREATE POLICY "Admins can update merge logs"
ON public.task_merge_logs
FOR UPDATE
USING (is_admin(auth.uid(), organization_id));

-- Create index for efficient queries
CREATE INDEX idx_task_merge_logs_org ON public.task_merge_logs(organization_id);
CREATE INDEX idx_task_merge_logs_status ON public.task_merge_logs(status) WHERE status = 'pending_revert';