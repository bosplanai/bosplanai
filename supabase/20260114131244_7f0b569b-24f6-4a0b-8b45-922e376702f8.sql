-- Create template_categories enum
CREATE TYPE public.template_category AS ENUM ('operations', 'strategic', 'product', 'general');

-- Create template_type enum
CREATE TYPE public.template_type AS ENUM ('task', 'document');

-- Create templates table
CREATE TABLE public.templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category template_category NOT NULL DEFAULT 'general',
    template_type template_type NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create template_versions table for version history
CREATE TABLE public.template_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    version_note TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(template_id, version_number)
);

-- Create template_tasks table for task templates
CREATE TABLE public.template_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    template_version_id UUID NOT NULL REFERENCES public.template_versions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    default_board TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_documents table for document templates
CREATE TABLE public.template_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    template_version_id UUID NOT NULL REFERENCES public.template_versions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    drive_file_id UUID REFERENCES public.drive_files(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates (Full Access and Manager can view/manage)
CREATE POLICY "Users can view templates in their organization"
ON public.templates FOR SELECT
USING (
    is_org_member(auth.uid(), organization_id)
    AND (
        has_role(auth.uid(), organization_id, 'admin'::app_role) 
        OR has_role(auth.uid(), organization_id, 'member'::app_role)
    )
);

CREATE POLICY "Admins and members can create templates"
ON public.templates FOR INSERT
WITH CHECK (
    is_org_member(auth.uid(), organization_id)
    AND (
        has_role(auth.uid(), organization_id, 'admin'::app_role) 
        OR has_role(auth.uid(), organization_id, 'member'::app_role)
    )
);

CREATE POLICY "Admins and members can update templates"
ON public.templates FOR UPDATE
USING (
    is_org_member(auth.uid(), organization_id)
    AND (
        has_role(auth.uid(), organization_id, 'admin'::app_role) 
        OR has_role(auth.uid(), organization_id, 'member'::app_role)
    )
);

CREATE POLICY "Admins and members can delete templates"
ON public.templates FOR DELETE
USING (
    is_org_member(auth.uid(), organization_id)
    AND (
        has_role(auth.uid(), organization_id, 'admin'::app_role) 
        OR has_role(auth.uid(), organization_id, 'member'::app_role)
    )
);

-- RLS Policies for template_versions
CREATE POLICY "Users can view template versions"
ON public.template_versions FOR SELECT
USING (
    template_id IN (
        SELECT id FROM public.templates WHERE is_org_member(auth.uid(), organization_id)
    )
);

CREATE POLICY "Admins and members can create template versions"
ON public.template_versions FOR INSERT
WITH CHECK (
    template_id IN (
        SELECT id FROM public.templates 
        WHERE is_org_member(auth.uid(), organization_id)
        AND (
            has_role(auth.uid(), organization_id, 'admin'::app_role) 
            OR has_role(auth.uid(), organization_id, 'member'::app_role)
        )
    )
);

CREATE POLICY "Admins and members can delete template versions"
ON public.template_versions FOR DELETE
USING (
    template_id IN (
        SELECT id FROM public.templates 
        WHERE is_org_member(auth.uid(), organization_id)
        AND (
            has_role(auth.uid(), organization_id, 'admin'::app_role) 
            OR has_role(auth.uid(), organization_id, 'member'::app_role)
        )
    )
);

-- RLS Policies for template_tasks
CREATE POLICY "Users can view template tasks"
ON public.template_tasks FOR SELECT
USING (
    template_id IN (
        SELECT id FROM public.templates WHERE is_org_member(auth.uid(), organization_id)
    )
);

CREATE POLICY "Admins and members can manage template tasks"
ON public.template_tasks FOR ALL
USING (
    template_id IN (
        SELECT id FROM public.templates 
        WHERE is_org_member(auth.uid(), organization_id)
        AND (
            has_role(auth.uid(), organization_id, 'admin'::app_role) 
            OR has_role(auth.uid(), organization_id, 'member'::app_role)
        )
    )
);

-- RLS Policies for template_documents
CREATE POLICY "Users can view template documents"
ON public.template_documents FOR SELECT
USING (
    template_id IN (
        SELECT id FROM public.templates WHERE is_org_member(auth.uid(), organization_id)
    )
);

CREATE POLICY "Admins and members can manage template documents"
ON public.template_documents FOR ALL
USING (
    template_id IN (
        SELECT id FROM public.templates 
        WHERE is_org_member(auth.uid(), organization_id)
        AND (
            has_role(auth.uid(), organization_id, 'admin'::app_role) 
            OR has_role(auth.uid(), organization_id, 'member'::app_role)
        )
    )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_templates_organization ON public.templates(organization_id);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_type ON public.templates(template_type);
CREATE INDEX idx_template_versions_template ON public.template_versions(template_id);
CREATE INDEX idx_template_tasks_template ON public.template_tasks(template_id);
CREATE INDEX idx_template_tasks_version ON public.template_tasks(template_version_id);
CREATE INDEX idx_template_documents_template ON public.template_documents(template_id);