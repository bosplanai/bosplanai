-- Create registration_links table for unique signup links
CREATE TABLE public.registration_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.specialist_plans(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  max_uses INTEGER, -- null = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on referral_code for fast lookups
CREATE UNIQUE INDEX idx_registration_links_referral_code ON public.registration_links(referral_code);

-- Create index on plan_id for joins
CREATE INDEX idx_registration_links_plan_id ON public.registration_links(plan_id);

-- Enable RLS
ALTER TABLE public.registration_links ENABLE ROW LEVEL SECURITY;

-- Super admin can view all registration links (using user_roles table)
CREATE POLICY "Super admins can view all registration links"
ON public.registration_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admin can create registration links
CREATE POLICY "Super admins can create registration links"
ON public.registration_links FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admin can update registration links
CREATE POLICY "Super admins can update registration links"
ON public.registration_links FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admin can delete registration links
CREATE POLICY "Super admins can delete registration links"
ON public.registration_links FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Anyone can view active links by referral code (for signup page validation)
CREATE POLICY "Anyone can view active registration links by code"
ON public.registration_links FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR current_uses < max_uses)
);

-- Create function to validate and use a referral code
CREATE OR REPLACE FUNCTION public.validate_referral_code(code TEXT)
RETURNS TABLE (
  link_id UUID,
  plan_id UUID,
  plan_name TEXT,
  plan_duration_months INTEGER,
  plan_max_users INTEGER,
  plan_terms TEXT,
  is_valid BOOLEAN,
  error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  link_record registration_links%ROWTYPE;
  plan_record specialist_plans%ROWTYPE;
BEGIN
  -- Find the link
  SELECT * INTO link_record FROM registration_links 
  WHERE referral_code = code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::TEXT,
      false, 'Invalid referral code'::TEXT;
    RETURN;
  END IF;
  
  -- Check if active
  IF NOT link_record.is_active THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::TEXT,
      false, 'This registration link is no longer active'::TEXT;
    RETURN;
  END IF;
  
  -- Check expiry
  IF link_record.expires_at IS NOT NULL AND link_record.expires_at < now() THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::TEXT,
      false, 'This registration link has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check max uses
  IF link_record.max_uses IS NOT NULL AND link_record.current_uses >= link_record.max_uses THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::TEXT,
      false, 'This registration link has reached its maximum number of uses'::TEXT;
    RETURN;
  END IF;
  
  -- Get the plan
  SELECT * INTO plan_record FROM specialist_plans 
  WHERE id = link_record.plan_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::TEXT,
      false, 'The specialist plan for this link is no longer available'::TEXT;
    RETURN;
  END IF;
  
  -- Return valid result
  RETURN QUERY SELECT 
    link_record.id,
    plan_record.id,
    plan_record.name,
    plan_record.duration_months,
    plan_record.max_users,
    plan_record.terms_and_conditions,
    true,
    NULL::TEXT;
END;
$$;

-- Create function to complete specialist signup
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
  
  -- Create user role as admin
  INSERT INTO user_roles (user_id, organization_id, role)
  VALUES (_user_id, new_org_id, 'admin');
  
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

-- Add trigger for updated_at
CREATE TRIGGER update_registration_links_updated_at
BEFORE UPDATE ON public.registration_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();