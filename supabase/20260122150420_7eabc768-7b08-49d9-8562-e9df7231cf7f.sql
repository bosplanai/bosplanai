-- Update accept_invite function to set onboarding_completed = false for non-viewer roles
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
  v_invite RECORD;
  v_profile_exists BOOLEAN;
  v_user_email TEXT;
  v_role_exists BOOLEAN;
  v_should_onboard BOOLEAN;
BEGIN
  -- Get the invite
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();
    
  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Get the user's email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = _user_id;
  
  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Validate email matches the invite
  IF lower(v_user_email) != lower(v_invite.email) THEN
    RETURN json_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;
  
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = _user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RETURN json_build_object('success', false, 'error', 'User already has a profile');
  END IF;
  
  -- Determine if user should go through onboarding (non-viewers: admin and member)
  v_should_onboard := v_invite.role IN ('admin', 'member');
  
  -- Create profile with appropriate onboarding status
  INSERT INTO profiles (id, organization_id, full_name, job_role, phone_number, onboarding_completed)
  VALUES (_user_id, v_invite.organization_id, _full_name, _job_role, _phone_number, NOT v_should_onboard);
  
  -- Check if user_role already exists
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND organization_id = v_invite.organization_id
  ) INTO v_role_exists;
  
  IF v_role_exists THEN
    -- Update existing role
    UPDATE user_roles
    SET role = v_invite.role
    WHERE user_id = _user_id AND organization_id = v_invite.organization_id;
  ELSE
    -- Insert new role
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (_user_id, v_invite.organization_id, v_invite.role);
  END IF;
  
  -- Mark invite as accepted
  UPDATE organization_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;
  
  RETURN json_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role
  );
END;
$$;

-- Create a trigger function to reset onboarding when a user is upgraded from viewer to member/admin
CREATE OR REPLACE FUNCTION public.handle_role_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is being upgraded from viewer to member or admin, reset onboarding
  IF OLD.role = 'viewer' AND NEW.role IN ('member', 'admin') THEN
    UPDATE profiles
    SET onboarding_completed = false
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role upgrades
DROP TRIGGER IF EXISTS on_role_upgrade ON public.user_roles;
CREATE TRIGGER on_role_upgrade
  AFTER UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_role_upgrade();