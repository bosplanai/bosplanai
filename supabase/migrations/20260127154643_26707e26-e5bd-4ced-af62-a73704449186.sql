-- Update get_invite_by_token to accept TEXT token (for URL-safe tokens)
DROP FUNCTION IF EXISTS public.get_invite_by_token(uuid);

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token TEXT)
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
    oi.id::text as token,
    oi.expires_at,
    oi.status,
    o.name as org_name,
    o.slug as org_slug,
    p.full_name as invited_by_name
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE oi.id::text = _token
    AND oi.status = 'pending'
    AND oi.expires_at > now();
$$;

-- Update accept_invite function to properly handle invited users
-- They should skip onboarding and go straight to Tasks page
DROP FUNCTION IF EXISTS public.accept_invite(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.accept_invite(text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.accept_invite(
  _token TEXT,
  _user_id UUID,
  _full_name TEXT,
  _job_role TEXT,
  _phone_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite organization_invites%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_role app_role;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE id::text = _token
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

  -- Map role string to app_role enum
  v_role := v_invite.role::app_role;

  -- Check if user already has a profile
  IF EXISTS (SELECT 1 FROM profiles WHERE id = _user_id) THEN
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
    VALUES (_user_id, v_invite.organization_id, _full_name, _job_role, _phone_number, true);

    -- Create user role
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (_user_id, v_invite.organization_id, v_role);
  END IF;

  -- Mark invite as accepted
  UPDATE organization_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'organization_slug', v_org.slug,
    'organization_name', v_org.name,
    'role', v_invite.role
  );
END;
$$;

-- Grant execute to authenticated users (for when they accept invite)
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;