-- =====================================================
-- DRIVE FILE ACCESS TABLE (for file sharing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.drive_file_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  granted_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  permission_level TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(file_id, granted_to)
);

-- Enable RLS
ALTER TABLE public.drive_file_access ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drive_file_access_file_id ON public.drive_file_access(file_id);
CREATE INDEX IF NOT EXISTS idx_drive_file_access_granted_to ON public.drive_file_access(granted_to);

-- RLS Policies
CREATE POLICY "Users can view file access in their org"
ON public.drive_file_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drive_files df
    WHERE df.id = file_id AND is_org_member(auth.uid(), df.organization_id)
  )
);

CREATE POLICY "Users can share files they uploaded"
ON public.drive_file_access FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.drive_files df
    WHERE df.id = file_id AND (df.uploaded_by = auth.uid() OR is_org_admin(auth.uid(), df.organization_id))
  )
);

CREATE POLICY "File owners can manage access"
ON public.drive_file_access FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.drive_files df
    WHERE df.id = file_id AND (df.uploaded_by = auth.uid() OR is_org_admin(auth.uid(), df.organization_id))
  )
);

-- Trigger for file shared notification
DROP TRIGGER IF EXISTS on_file_shared_notify ON public.drive_file_access;
CREATE TRIGGER on_file_shared_notify
  AFTER INSERT ON public.drive_file_access
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_file_shared();

-- =====================================================
-- POLICIES TABLE (for compliance/governance policies)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active',
  effective_date DATE,
  expiry_date DATE,
  review_frequency_days INTEGER DEFAULT 365,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_policies_organization_id ON public.policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_expiry_date ON public.policies(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);

-- RLS Policies
CREATE POLICY "Users can view policies in their organization"
ON public.policies FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can create policies"
ON public.policies FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update policies"
ON public.policies FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete policies"
ON public.policies FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- POLICY EXPIRATION NOTIFICATION FUNCTION
-- This will be called by a scheduled job
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_policy_expired()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_record RECORD;
  admin_record RECORD;
BEGIN
  -- Find policies that expired today or recently
  FOR policy_record IN
    SELECT id, title, organization_id
    FROM public.policies
    WHERE expiry_date IS NOT NULL
      AND expiry_date <= CURRENT_DATE
      AND expiry_date >= CURRENT_DATE - INTERVAL '1 day'
      AND status = 'active'
  LOOP
    -- Update policy status to expired
    UPDATE public.policies SET status = 'expired' WHERE id = policy_record.id;
    
    -- Notify all Full Access (admin) users in the organization
    FOR admin_record IN 
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.organization_id = policy_record.organization_id
        AND ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
      VALUES (
        admin_record.user_id,
        policy_record.organization_id,
        'policy_expired',
        'Policy Expired',
        'The policy ''' || policy_record.title || ''' has expired and needs to be reviewed',
        policy_record.id,
        'policy'
      );
    END LOOP;
  END LOOP;
END;
$$;