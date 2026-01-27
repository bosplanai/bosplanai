-- Create organizations table
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    employee_size text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    job_role text NOT NULL,
    phone_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_deletion_at timestamp with time zone
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add organization_id column to user_roles
ALTER TABLE public.user_roles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create function to generate unique org slug
CREATE OR REPLACE FUNCTION public.generate_org_slug(org_name text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create the create_organization_and_profile function
CREATE OR REPLACE FUNCTION public.create_organization_and_profile(
    _user_id uuid, 
    _org_name text, 
    _employee_size text, 
    _full_name text, 
    _job_role text, 
    _phone_number text
) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Generate a unique slug
  v_slug := generate_org_slug(_org_name);

  -- Create organization
  INSERT INTO organizations(name, slug, employee_size)
  VALUES (trim(_org_name), v_slug, _employee_size)
  RETURNING id INTO v_org_id;

  -- Create profile for the owner
  INSERT INTO profiles(id, organization_id, full_name, job_role, phone_number)
  VALUES (_user_id, v_org_id, trim(_full_name), trim(_job_role), trim(_phone_number));

  -- Create admin role for the organization creator
  INSERT INTO user_roles(user_id, organization_id, role)
  VALUES (_user_id, v_org_id, 'admin');

  RETURN v_org_id;
END;
$$;

-- Create is_org_member helper function
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- RLS policies for organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organizations.id
  )
);

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = organizations.id
    AND user_roles.role = 'admin'
  )
);

-- RLS policies for profiles
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = profiles.organization_id
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());