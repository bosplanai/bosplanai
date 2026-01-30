-- Update create_organization_and_profile to handle orphaned user_roles and add conflict resolution
CREATE OR REPLACE FUNCTION public.create_organization_and_profile(_user_id uuid, _org_name text, _employee_size text, _full_name text, _job_role text, _phone_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Clean up any orphaned user_roles for this user (where the organization no longer exists)
  DELETE FROM user_roles 
  WHERE user_id = _user_id 
    AND organization_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = user_roles.organization_id);

  -- Generate a unique slug
  v_slug := generate_org_slug(_org_name);

  -- Create organization
  INSERT INTO organizations(name, slug, employee_size)
  VALUES (trim(_org_name), v_slug, _employee_size)
  RETURNING id INTO v_org_id;

  -- Create profile for the owner (use ON CONFLICT to handle retry scenarios)
  INSERT INTO profiles(id, organization_id, full_name, job_role, phone_number)
  VALUES (_user_id, v_org_id, trim(_full_name), trim(_job_role), trim(_phone_number))
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    full_name = EXCLUDED.full_name,
    job_role = EXCLUDED.job_role,
    phone_number = EXCLUDED.phone_number;

  -- Create admin role for the organization creator (use ON CONFLICT to handle retry scenarios)
  INSERT INTO user_roles(user_id, organization_id, role)
  VALUES (_user_id, v_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) WHERE organization_id IS NOT NULL
  DO UPDATE SET role = 'admin';

  RETURN v_org_id;
END;
$function$;