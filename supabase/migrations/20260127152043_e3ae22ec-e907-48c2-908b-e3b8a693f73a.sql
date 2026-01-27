-- Create organization_invites table for team member invitations
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_role CHECK (role IN ('admin', 'member', 'viewer')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Create unique constraint for pending invites
CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_unique_pending 
ON public.organization_invites (organization_id, lower(email)) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view invites for their organizations
CREATE POLICY "Admins can view organization invites"
ON public.organization_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organization_invites.organization_id
    AND user_roles.role = 'admin'
  )
);

-- Admins can insert invites for their organizations
CREATE POLICY "Admins can insert organization invites"
ON public.organization_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organization_invites.organization_id
    AND user_roles.role = 'admin'
  )
);

-- Admins can update invites for their organizations
CREATE POLICY "Admins can update organization invites"
ON public.organization_invites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organization_invites.organization_id
    AND user_roles.role = 'admin'
  )
);

-- Admins can delete invites for their organizations
CREATE POLICY "Admins can delete organization invites"
ON public.organization_invites
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organization_invites.organization_id
    AND user_roles.role = 'admin'
  )
);