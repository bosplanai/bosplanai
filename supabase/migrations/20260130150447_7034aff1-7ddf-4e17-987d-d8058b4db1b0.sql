-- Fix invitation lookup to support both new token and legacy UUID id
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  FROM public.organization_invites oi
  JOIN public.organizations o ON o.id = oi.organization_id
  LEFT JOIN public.profiles p ON p.id = oi.invited_by
  WHERE (oi.token = _token OR oi.id::text = _token)
    AND oi.status = 'pending'
    AND oi.expires_at > now();
$function$;

-- Ensure multi-org acceptance also creates the invited user's profile and sets a default org
CREATE OR REPLACE FUNCTION public.accept_all_pending_invites(
  _user_id uuid,
  _email text,
  _full_name text DEFAULT NULL,
  _job_role text DEFAULT NULL,
  _phone_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite RECORD;
  v_role public.app_role;
  v_accepted_count integer := 0;
  v_first_org_slug text;
  v_first_org_id uuid;
  v_profile_exists boolean;
BEGIN
  -- If this is a brand new user, we should create their profile and set the default organization
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = _user_id) INTO v_profile_exists;

  FOR v_invite IN
    SELECT oi.*, o.slug as org_slug
    FROM public.organization_invites oi
    JOIN public.organizations o ON o.id = oi.organization_id
    WHERE lower(oi.email) = lower(_email)
      AND oi.status = 'pending'
      AND oi.expires_at > now()
    ORDER BY oi.created_at ASC
  LOOP
    -- Capture the first org as default
    IF v_first_org_slug IS NULL THEN
      v_first_org_slug := v_invite.org_slug;
      v_first_org_id := v_invite.organization_id;

      IF NOT v_profile_exists THEN
        INSERT INTO public.profiles (id, organization_id, full_name, job_role, phone_number, onboarding_completed)
        VALUES (
          _user_id,
          v_first_org_id,
          COALESCE(NULLIF(trim(_full_name), ''), 'New User'),
          COALESCE(NULLIF(trim(_job_role), ''), 'Team Member'),
          COALESCE(NULLIF(trim(_phone_number), ''), ''),
          true
        )
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END IF;

    -- Map invite role to app_role
    CASE v_invite.role
      WHEN 'admin' THEN v_role := 'admin'::public.app_role;
      WHEN 'member' THEN v_role := 'moderator'::public.app_role;
      WHEN 'viewer' THEN v_role := 'user'::public.app_role;
      ELSE v_role := 'user'::public.app_role;
    END CASE;

    -- Add user to organization if not already member
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND organization_id = v_invite.organization_id
    ) THEN
      INSERT INTO public.user_roles (user_id, organization_id, role)
      VALUES (_user_id, v_invite.organization_id, v_role);
    END IF;

    -- Mark invite as accepted
    UPDATE public.organization_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite.id;

    v_accepted_count := v_accepted_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'accepted_count', v_accepted_count,
    'first_org_slug', v_first_org_slug
  );
END;
$function$;