-- Create tasks table
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'todo'::text NOT NULL,
    icon text DEFAULT 'ListTodo'::text NOT NULL,
    category text DEFAULT 'operational'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    position integer DEFAULT 0 NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_date date,
    attachment_url text,
    attachment_name text,
    description text,
    subcategory text DEFAULT 'weekly'::text NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at timestamp with time zone,
    completed_at timestamp with time zone,
    project_id uuid,
    is_recurring boolean DEFAULT false NOT NULL,
    is_draft boolean DEFAULT false NOT NULL,
    assignment_status text DEFAULT 'accepted'::text NOT NULL,
    archived_at timestamp with time zone,
    decline_reason text,
    last_reminder_sent_at timestamp with time zone,
    CONSTRAINT tasks_description_length CHECK ((char_length(description) <= 2000)),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'complete'::text]))),
    CONSTRAINT tasks_subcategory_check CHECK ((subcategory = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text, 'misc'::text]))),
    CONSTRAINT tasks_assignment_status_check CHECK ((assignment_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))
);

-- Create task_assignments table for multi-user assignments
CREATE TABLE public.task_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their organization"
ON public.tasks FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create tasks in their organization"
ON public.tasks FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update tasks in their organization"
ON public.tasks FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete tasks in their organization"
ON public.tasks FOR DELETE
USING (is_org_member(auth.uid(), organization_id));

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments in their organization"
ON public.task_assignments FOR SELECT
USING (
    task_id IN (SELECT id FROM public.tasks WHERE is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can manage task assignments in their organization"
ON public.task_assignments FOR ALL
USING (
    task_id IN (SELECT id FROM public.tasks WHERE is_org_member(auth.uid(), organization_id))
);

-- Create indexes for performance
CREATE INDEX idx_tasks_organization ON public.tasks(organization_id);
CREATE INDEX idx_tasks_user ON public.tasks(user_id);
CREATE INDEX idx_tasks_assigned_user ON public.tasks(assigned_user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_category ON public.tasks(category);
CREATE INDEX idx_task_assignments_task ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_user ON public.task_assignments(user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();