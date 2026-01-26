-- Create virtual_assistants table for super admins to manage VA accounts
CREATE TABLE public.virtual_assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  description TEXT,
  specialization TEXT,
  hourly_rate NUMERIC(10, 2),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.virtual_assistants ENABLE ROW LEVEL SECURITY;

-- Only super admins can view all virtual assistants
CREATE POLICY "Super admins can view all virtual assistants"
ON public.virtual_assistants
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Only super admins can create virtual assistants
CREATE POLICY "Super admins can create virtual assistants"
ON public.virtual_assistants
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Only super admins can update virtual assistants
CREATE POLICY "Super admins can update virtual assistants"
ON public.virtual_assistants
FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- Only super admins can delete virtual assistants
CREATE POLICY "Super admins can delete virtual assistants"
ON public.virtual_assistants
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_virtual_assistants_updated_at
BEFORE UPDATE ON public.virtual_assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();