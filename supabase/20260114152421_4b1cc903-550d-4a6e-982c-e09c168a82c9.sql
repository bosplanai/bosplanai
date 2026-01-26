-- Create a table to track super admin organizations
CREATE TABLE public.super_admin_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.super_admin_orgs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view this table
CREATE POLICY "Super admins can view super admin orgs"
ON public.super_admin_orgs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  )
);

-- Create a table for specialist plans
CREATE TABLE public.specialist_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL,
  max_users INTEGER, -- NULL means unlimited
  registration_code TEXT NOT NULL UNIQUE,
  terms_and_conditions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialist_plans ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage specialist plans
CREATE POLICY "Super admins can manage specialist plans"
ON public.specialist_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  )
);

-- Anyone can view active plans (for registration)
CREATE POLICY "Anyone can view active specialist plans"
ON public.specialist_plans
FOR SELECT
USING (is_active = true);

-- Create a table to link organizations to specialist plans
CREATE TABLE public.organization_specialist_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.specialist_plans(id) ON DELETE CASCADE,
  referral_code TEXT,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  agreed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_specialist_plans ENABLE ROW LEVEL SECURITY;

-- Super admins can view all
CREATE POLICY "Super admins can manage all org specialist plans"
ON public.organization_specialist_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  )
);

-- Org members can view their own plan
CREATE POLICY "Org members can view their specialist plan"
ON public.organization_specialist_plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = organization_specialist_plans.organization_id
  )
);

-- Add suspended status to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create trigger for updated_at on specialist_plans
CREATE TRIGGER update_specialist_plans_updated_at
  BEFORE UPDATE ON public.specialist_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();