-- Create policies table
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_id UUID REFERENCES public.drive_files(id) ON DELETE SET NULL,
  current_version INTEGER DEFAULT 1 NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'draft', 'archived', 'expired')),
  effective_date DATE,
  expiry_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create policy tags table
CREATE TABLE public.policy_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(organization_id, name)
);

-- Create policy_tag_assignments junction table
CREATE TABLE public.policy_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.policy_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(policy_id, tag_id)
);

-- Create policy versions table for version history
CREATE TABLE public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_id UUID REFERENCES public.drive_files(id) ON DELETE SET NULL,
  change_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(policy_id, version_number)
);

-- Insert default policy tags
INSERT INTO public.policy_tags (organization_id, name, color)
SELECT id, 'HR', '#ec4899' FROM organizations
UNION ALL
SELECT id, 'Operations', '#3b82f6' FROM organizations
UNION ALL
SELECT id, 'Safety', '#ef4444' FROM organizations
UNION ALL
SELECT id, 'Finance', '#10b981' FROM organizations
UNION ALL
SELECT id, 'Legal', '#8b5cf6' FROM organizations
UNION ALL
SELECT id, 'IT', '#06b6d4' FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for policies table
CREATE POLICY "Users can view policies in their organization"
ON public.policies FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can insert policies"
ON public.policies FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid(), organization_id)
);

CREATE POLICY "Admins can update policies"
ON public.policies FOR UPDATE
USING (public.is_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete policies"
ON public.policies FOR DELETE
USING (public.is_admin(auth.uid(), organization_id));

-- RLS policies for policy_tags table
CREATE POLICY "Users can view policy tags in their organization"
ON public.policy_tags FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage policy tags"
ON public.policy_tags FOR ALL
USING (public.is_admin(auth.uid(), organization_id));

-- RLS policies for policy_tag_assignments table
CREATE POLICY "Users can view policy tag assignments"
ON public.policy_tag_assignments FOR SELECT
USING (
  policy_id IN (
    SELECT id FROM public.policies 
    WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage policy tag assignments"
ON public.policy_tag_assignments FOR ALL
USING (
  policy_id IN (
    SELECT id FROM public.policies 
    WHERE public.is_admin(auth.uid(), organization_id)
  )
);

-- RLS policies for policy_versions table
CREATE POLICY "Users can view policy versions"
ON public.policy_versions FOR SELECT
USING (
  policy_id IN (
    SELECT id FROM public.policies 
    WHERE organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can insert policy versions"
ON public.policy_versions FOR INSERT
WITH CHECK (
  policy_id IN (
    SELECT id FROM public.policies 
    WHERE public.is_admin(auth.uid(), organization_id)
  )
);

-- Super admin policies
CREATE POLICY "Super admins can view all policies"
ON public.policies FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all policy tags"
ON public.policy_tags FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all policy tag assignments"
ON public.policy_tag_assignments FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all policy versions"
ON public.policy_versions FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for expiry notifications
CREATE INDEX idx_policies_expiry_date ON public.policies(expiry_date) WHERE status = 'active' AND expiry_date IS NOT NULL;