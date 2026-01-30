-- Add token column to organization_invites for secure invite links
-- The token is separate from the ID for security purposes
ALTER TABLE public.organization_invites 
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;

-- Generate tokens for existing invites that don't have one
UPDATE public.organization_invites
SET token = encode(gen_random_bytes(32), 'hex')
WHERE token IS NULL;

-- Make token NOT NULL after populating existing records
ALTER TABLE public.organization_invites 
ALTER COLUMN token SET NOT NULL,
ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- Update default expiry to 2 days instead of 7
ALTER TABLE public.organization_invites 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '2 days');

-- Add index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON public.organization_invites(token);

-- Add unique constraint to prevent duplicate pending invites for same email+org
-- First drop any existing constraint if it exists
DROP INDEX IF EXISTS idx_unique_pending_invite_per_org;

-- Create partial unique index for pending invites
CREATE UNIQUE INDEX idx_unique_pending_invite_per_org 
ON public.organization_invites(organization_id, lower(email))
WHERE status = 'pending';

-- Update the get_invite_by_token function to use the new token column
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE(
  id uuid, 
  email text, 
  role text, 
  organization_id uuid, 
  token text, 
  expires_at timestamp with time zone, 
  status text, 
  org_name text, 
  org_slug text, 
  invited_by_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    oi.id,
    oi.email,
    oi.role::text,
    oi.organization_id,
    oi.token,
    oi.expires_at,
    oi.status,
    o.name as org_name,
    o.slug as org_slug,
    p.full_name as invited_by_name
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE oi.token = _token
    AND oi.status = 'pending'
    AND oi.expires_at > now();
$$;

-- Create function to get all pending invites for an email (for multi-org display)
CREATE OR REPLACE FUNCTION public.get_pending_invites_by_email(_email text)
RETURNS TABLE(
  id uuid, 
  email text, 
  role text, 
  organization_id uuid, 
  token text, 
  expires_at timestamp with time zone, 
  status text, 
  org_name text, 
  org_slug text, 
  invited_by_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    oi.id,
    oi.email,
    oi.role::text,
    oi.organization_id,
    oi.token,
    oi.expires_at,
    oi.status,
    o.name as org_name,
    o.slug as org_slug,
    p.full_name as invited_by_name
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE lower(oi.email) = lower(_email)
    AND oi.status = 'pending'
    AND oi.expires_at > now()
  ORDER BY oi.created_at DESC;
$$;

-- Update accept_invite to handle multi-org invites and use token
CREATE OR REPLACE FUNCTION public.accept_invite(
  _token text, 
  _user_id uuid, 
  _full_name text, 
  _job_role text, 
  _phone_number text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite organization_invites%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_role app_role;
  v_profile_exists boolean;
  v_pending_invites_count integer;
BEGIN
  -- Find the invite by token or by id (for backwards compatibility)
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE (token = _token OR id::text = _token)
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Get the organization
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_invite.organization_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Map invite role string to app_role enum
  CASE v_invite.role
    WHEN 'admin' THEN v_role := 'admin'::app_role;
    WHEN 'member' THEN v_role := 'moderator'::app_role;
    WHEN 'viewer' THEN v_role := 'user'::app_role;
    ELSE v_role := 'user'::app_role;
  END CASE;

  -- Check if user already has a profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = _user_id) INTO v_profile_exists;

  IF v_profile_exists THEN
    -- User exists, just add role to new org if not already member
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND organization_id = v_invite.organization_id
    ) THEN
      INSERT INTO user_roles (user_id, organization_id, role)
      VALUES (_user_id, v_invite.organization_id, v_role);
    END IF;
  ELSE
    -- Create profile with onboarding_completed = true (invited users skip onboarding)
    INSERT INTO profiles (id, organization_id, full_name, job_role, phone_number, onboarding_completed)
    VALUES (_user_id, v_invite.organization_id, _full_name, _job_role, _phone_number, true)
    ON CONFLICT (id) DO NOTHING;

    -- Create user role only if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND organization_id = v_invite.organization_id
    ) THEN
      INSERT INTO user_roles (user_id, organization_id, role)
      VALUES (_user_id, v_invite.organization_id, v_role);
    END IF;
  END IF;

  -- Mark this invite as accepted
  UPDATE organization_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  -- Count remaining pending invites for this user's email
  SELECT COUNT(*) INTO v_pending_invites_count
  FROM organization_invites
  WHERE lower(email) = lower(v_invite.email)
    AND status = 'pending'
    AND expires_at > now();

  RETURN json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'organization_slug', v_org.slug,
    'organization_name', v_org.name,
    'role', v_invite.role,
    'has_more_pending_invites', v_pending_invites_count > 0,
    'pending_invites_count', v_pending_invites_count
  );
END;
$$;

-- Create function to accept all pending invites for a user
CREATE OR REPLACE FUNCTION public.accept_all_pending_invites(_user_id uuid, _email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_role app_role;
  v_accepted_count integer := 0;
  v_first_org_slug text;
BEGIN
  FOR v_invite IN
    SELECT oi.*, o.slug as org_slug
    FROM organization_invites oi
    JOIN organizations o ON o.id = oi.organization_id
    WHERE lower(oi.email) = lower(_email)
      AND oi.status = 'pending'
      AND oi.expires_at > now()
    ORDER BY oi.created_at ASC
  LOOP
    -- Map invite role to app_role
    CASE v_invite.role
      WHEN 'admin' THEN v_role := 'admin'::app_role;
      WHEN 'member' THEN v_role := 'moderator'::app_role;
      WHEN 'viewer' THEN v_role := 'user'::app_role;
      ELSE v_role := 'user'::app_role;
    END CASE;

    -- Add user to organization if not already member
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND organization_id = v_invite.organization_id
    ) THEN
      INSERT INTO user_roles (user_id, organization_id, role)
      VALUES (_user_id, v_invite.organization_id, v_role);
    END IF;

    -- Mark invite as accepted
    UPDATE organization_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite.id;

    v_accepted_count := v_accepted_count + 1;
    
    -- Store first org slug for redirect
    IF v_first_org_slug IS NULL THEN
      v_first_org_slug := v_invite.org_slug;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'accepted_count', v_accepted_count,
    'first_org_slug', v_first_org_slug
  );
END;
$$;