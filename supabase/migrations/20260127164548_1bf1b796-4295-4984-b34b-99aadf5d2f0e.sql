-- Fix the accept_invite function to properly map invite roles to app_role enum values
-- Invite roles: 'admin', 'member', 'viewer'
-- Enum values: 'admin', 'moderator', 'user', 'super_admin'

CREATE OR REPLACE FUNCTION public.accept_invite(_token text, _user_id uuid, _full_name text, _job_role text, _phone_number text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Map invite role string to app_role enum
  -- Invite uses: admin, member, viewer
  -- Enum has: admin, moderator, user, super_admin
  CASE v_invite.role
    WHEN 'admin' THEN v_role := 'admin'::app_role;
    WHEN 'member' THEN v_role := 'moderator'::app_role;
    WHEN 'viewer' THEN v_role := 'user'::app_role;
    ELSE v_role := 'user'::app_role; -- Default fallback
  END CASE;

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
$function$;