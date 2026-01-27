-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create specialist_plans table
CREATE TABLE public.specialist_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL,
  max_users INTEGER,
  registration_code TEXT NOT NULL UNIQUE,
  terms_and_conditions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on specialist_plans
ALTER TABLE public.specialist_plans ENABLE ROW LEVEL SECURITY;

-- Super admins can manage specialist plans
CREATE POLICY "Super admins can manage specialist plans"
ON public.specialist_plans
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Anyone can view active plans (for registration)
CREATE POLICY "Anyone can view active specialist plans"
ON public.specialist_plans
FOR SELECT
USING (is_active = true);

-- Create registration_links table
CREATE TABLE public.registration_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.specialist_plans(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on registration_links
ALTER TABLE public.registration_links ENABLE ROW LEVEL SECURITY;

-- Super admins can manage registration links
CREATE POLICY "Super admins can manage registration links"
ON public.registration_links
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Anyone can view active links (for registration validation)
CREATE POLICY "Anyone can view active registration links"
ON public.registration_links
FOR SELECT
USING (is_active = true);

-- Create va_pricing table for virtual assistant packages
CREATE TABLE public.va_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hours_package INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on va_pricing
ALTER TABLE public.va_pricing ENABLE ROW LEVEL SECURITY;

-- Super admins can manage VA pricing
CREATE POLICY "Super admins can manage va pricing"
ON public.va_pricing
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Anyone can view active pricing (for purchase flow)
CREATE POLICY "Anyone can view active va pricing"
ON public.va_pricing
FOR SELECT
USING (is_active = true);

-- Create organization_specialist_plans linking table
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

-- Enable RLS on organization_specialist_plans
ALTER TABLE public.organization_specialist_plans ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all org specialist plans
CREATE POLICY "Super admins can manage org specialist plans"
ON public.organization_specialist_plans
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Org members can view their specialist plan
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

-- Create trigger for updated_at on specialist_plans
CREATE TRIGGER update_specialist_plans_updated_at
  BEFORE UPDATE ON public.specialist_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on registration_links
CREATE TRIGGER update_registration_links_updated_at
  BEFORE UPDATE ON public.registration_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on va_pricing
CREATE TRIGGER update_va_pricing_updated_at
  BEFORE UPDATE ON public.va_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add scheduled_deletion_at to organizations if not exists
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP WITH TIME ZONE;