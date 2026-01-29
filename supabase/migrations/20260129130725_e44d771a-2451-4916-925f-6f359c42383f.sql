-- Create function to allow existing users to create additional organizations
CREATE OR REPLACE FUNCTION public.create_additional_organization(
  _org_name TEXT,
  _employee_size TEXT,
  _job_role TEXT,
  _phone_number TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_slug TEXT;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create an organization';
  END IF;

  -- Generate a unique slug
  v_slug := generate_org_slug(_org_name);

  -- Create organization
  INSERT INTO organizations(name, slug, employee_size)
  VALUES (trim(_org_name), v_slug, _employee_size)
  RETURNING id INTO v_org_id;

  -- Create admin role for the user in this new organization
  INSERT INTO user_roles(user_id, organization_id, role)
  VALUES (v_user_id, v_org_id, 'admin');

  RETURN v_org_id;
END;
$$;