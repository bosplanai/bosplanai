-- Fix complete_specialist_signup to handle existing user_roles entries
-- Use ON CONFLICT to update the role if a record already exists
CREATE OR REPLACE FUNCTION public.complete_specialist_signup(
  _user_id UUID,
  _referral_code TEXT,
  _org_name TEXT,
  _employee_size TEXT,
  _full_name TEXT,
  _job_role TEXT,
  _phone_number TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  link_record registration_links%ROWTYPE;
  plan_record specialist_plans%ROWTYPE;
  new_org_id UUID;
  expires_at_date TIMESTAMP WITH TIME ZONE;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Validate the referral code
  SELECT * INTO link_record FROM registration_links 
  WHERE referral_code = _referral_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired referral code');
  END IF;
  
  -- Get the plan
  SELECT * INTO plan_record FROM specialist_plans 
  WHERE id = link_record.plan_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Specialist plan not found');
  END IF;
  
  -- Check if user already has a profile (complete registration)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has a profile registered');
  END IF;
  
  -- Generate org slug
  base_slug := lower(regexp_replace(_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  -- Create organization
  INSERT INTO organizations (name, slug, employee_size)
  VALUES (_org_name, final_slug, _employee_size)
  RETURNING id INTO new_org_id;
  
  -- Create profile
  INSERT INTO profiles (id, organization_id, full_name, job_role, phone_number)
  VALUES (_user_id, new_org_id, _full_name, _job_role, _phone_number);
  
  -- Create or update user role as admin
  -- Use ON CONFLICT to handle case where user had a partial registration before
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (_user_id, new_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) WHERE organization_id IS NOT NULL
  DO UPDATE SET role = 'admin';
  
  -- Clean up any orphaned user_roles for this user with different organizations that don't exist
  DELETE FROM user_roles 
  WHERE user_id = _user_id 
    AND organization_id IS NOT NULL 
    AND organization_id != new_org_id
    AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = user_roles.organization_id);
  
  -- Calculate expiry date
  expires_at_date := now() + (plan_record.duration_months || ' months')::INTERVAL;
  
  -- Create organization specialist plan assignment
  INSERT INTO organization_specialist_plans (
    organization_id,
    plan_id,
    expires_at,
    referral_code,
    agreed_to_terms,
    agreed_at
  ) VALUES (
    new_org_id,
    plan_record.id,
    expires_at_date,
    _referral_code,
    true,
    now()
  );
  
  -- Increment the usage count on the link
  UPDATE registration_links 
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = link_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', new_org_id,
    'plan_name', plan_record.name,
    'expires_at', expires_at_date
  );
END;
$$;