CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'member',
    'viewer'
);


--
-- Name: accept_invite(uuid, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_invite(_token uuid, _user_id uuid, _full_name text, _job_role text, _phone_number text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invite RECORD;
  v_profile_exists BOOLEAN;
  v_user_email TEXT;
  v_role_exists BOOLEAN;
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
  
  -- Create profile
  INSERT INTO profiles (id, organization_id, full_name, job_role, phone_number)
  VALUES (_user_id, v_invite.organization_id, _full_name, _job_role, _phone_number);
  
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


--
-- Name: cleanup_deleted_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_deleted_tasks() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- This function should only be called by service role (cron jobs, admin tasks)
  -- Check that the caller is not an authenticated user (service role has no auth.uid())
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

  DELETE FROM public.tasks
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';
END;
$$;


--
-- Name: cleanup_scheduled_deletions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_scheduled_deletions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- This function should only be called by service role (cron jobs, admin tasks)
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

  -- We don't actually delete here - the edge function will handle the actual deletion
  -- This is just a placeholder for future cron job implementation
  RETURN;
END;
$$;


--
-- Name: create_additional_organization(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_additional_organization(_org_name text, _employee_size text, _job_role text, _phone_number text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
  v_user_id uuid;
BEGIN
  -- Get authenticated user ID - prevents spoofing
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF trim(_org_name) = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;
  
  IF trim(_employee_size) = '' THEN
    RAISE EXCEPTION 'Employee size is required';
  END IF;

  -- Generate a unique slug using existing helper
  v_slug := generate_org_slug(_org_name);

  -- Create organization
  INSERT INTO organizations(name, slug, employee_size)
  VALUES (trim(_org_name), v_slug, _employee_size)
  RETURNING id INTO v_org_id;

  -- Create admin role for the authenticated caller
  INSERT INTO user_roles(user_id, organization_id, role)
  VALUES (v_user_id, v_org_id, 'admin');

  -- Create subscription for the new organization
  INSERT INTO subscriptions(organization_id, status, plan_type)
  VALUES (v_org_id, 'trialing', 'monthly');

  RETURN v_org_id;
END;
$$;


--
-- Name: create_organization_and_profile(uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_organization_and_profile(_user_id uuid, _org_name text, _employee_size text, _full_name text, _job_role text, _phone_number text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Generate a unique slug using existing helper
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


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  year_month text;
  seq_num integer;
BEGIN
  year_month := to_char(now(), 'YYYYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 8) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '%';
  
  RETURN 'INV-' || year_month || '-' || LPAD(seq_num::text, 4, '0');
END;
$$;


--
-- Name: generate_org_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_org_slug(org_name text) RETURNS text
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


--
-- Name: get_invite_by_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_invite_by_token(_token uuid) RETURNS TABLE(id uuid, email text, role public.app_role, organization_id uuid, token uuid, expires_at timestamp with time zone, status text, org_name text, org_slug text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    oi.id,
    oi.email,
    oi.role,
    oi.organization_id,
    oi.token,
    oi.expires_at,
    oi.status,
    o.name as org_name,
    o.slug as org_slug
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  WHERE oi.token = _token
    AND oi.status = 'pending'
    AND oi.expires_at > now()
  LIMIT 1;
$$;


--
-- Name: get_task_organization_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_task_organization_id(_task_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT organization_id FROM public.tasks WHERE id = _task_id LIMIT 1;
$$;


--
-- Name: get_user_organization_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_organization_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;


--
-- Name: get_user_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid, _org_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND organization_id = _org_id
  LIMIT 1
$$;


--
-- Name: handle_new_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Role assignment is now handled by the calling code (edge function or RPC)
  -- This prevents duplicate key errors when creating team members
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _org_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
  )
$$;


--
-- Name: is_assigned_to_task(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_assigned_to_task(_user_id uuid, _task_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = _task_id AND assigned_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_id = _task_id AND user_id = _user_id
  );
$$;


--
-- Name: is_org_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid) RETURNS boolean
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


--
-- Name: is_viewer(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_viewer(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'viewer'
  )
$$;


--
-- Name: lookup_org_by_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lookup_org_by_slug(_slug text) RETURNS TABLE(id uuid, name text, slug text, logo_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id, name, slug, logo_url
  FROM organizations
  WHERE organizations.slug = _slug
  LIMIT 1;
$$;


--
-- Name: set_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_invoice_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: data_room_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_room_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    mime_type text,
    uploaded_by uuid NOT NULL,
    permission text DEFAULT 'view'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    data_room_id uuid,
    folder_id uuid
);


--
-- Name: data_room_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_room_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_room_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_room_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_room_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text NOT NULL,
    invited_by uuid NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    nda_signed_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    data_room_id uuid
);


--
-- Name: data_room_nda_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_room_nda_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data_room_id uuid NOT NULL,
    invite_id uuid NOT NULL,
    signer_email text NOT NULL,
    signer_name text NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    nda_content_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nda_content text,
    nda_required boolean DEFAULT false NOT NULL
);


--
-- Name: drive_file_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drive_file_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    shared_with uuid,
    share_token uuid DEFAULT gen_random_uuid(),
    permission text DEFAULT 'view'::text NOT NULL,
    is_link_share boolean DEFAULT false NOT NULL,
    link_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT drive_file_shares_permission_check CHECK ((permission = ANY (ARRAY['view'::text, 'edit'::text, 'manage'::text])))
);


--
-- Name: drive_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drive_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    folder_id uuid,
    name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    mime_type text,
    status text DEFAULT 'not_started'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    assigned_to uuid,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    parent_file_id uuid,
    description text
);


--
-- Name: drive_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drive_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    stripe_invoice_id text,
    invoice_number text NOT NULL,
    amount_due integer NOT NULL,
    amount_paid integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    description text,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    due_date timestamp with time zone,
    paid_at timestamp with time zone,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text NOT NULL,
    role public.app_role DEFAULT 'member'::public.app_role NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    invited_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    CONSTRAINT organization_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    employee_size text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text
);


--
-- Name: personal_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_checklist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    time_group text DEFAULT 'today'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    due_date date,
    priority text DEFAULT 'medium'::text,
    project_id uuid,
    icon text DEFAULT 'ListTodo'::text,
    attachment_url text,
    attachment_name text,
    CONSTRAINT personal_checklist_items_time_group_check CHECK ((time_group = ANY (ARRAY['today'::text, 'this_week'::text, 'this_month'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    full_name text NOT NULL,
    job_role text NOT NULL,
    phone_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_deletion_at timestamp with time zone
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    due_date date,
    organization_id uuid,
    assigned_user_id uuid,
    created_by_user_id uuid
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text DEFAULT 'trialing'::text NOT NULL,
    plan_type text DEFAULT 'monthly'::text NOT NULL,
    trial_ends_at timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    base_user_count integer DEFAULT 3 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    mime_type text,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'todo'::text NOT NULL,
    icon text DEFAULT 'ListTodo'::text NOT NULL,
    category text DEFAULT 'operational'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_date date,
    attachment_url text,
    attachment_name text,
    description text,
    subcategory text DEFAULT 'weekly'::text NOT NULL,
    organization_id uuid,
    assigned_user_id uuid,
    created_by_user_id uuid,
    deleted_at timestamp with time zone,
    completed_at timestamp with time zone,
    project_id uuid,
    is_recurring boolean DEFAULT false NOT NULL,
    CONSTRAINT tasks_description_length CHECK ((char_length(description) <= 2000)),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'complete'::text]))),
    CONSTRAINT tasks_subcategory_check CHECK ((subcategory = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text, 'misc'::text])))
);


--
-- Name: user_appearance_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_appearance_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_card_text_size numeric(3,2) DEFAULT 1.0 NOT NULL,
    project_card_text_size numeric(3,2) DEFAULT 1.0 NOT NULL,
    drive_file_text_size numeric(3,2) DEFAULT 1.0 NOT NULL,
    brand_green text DEFAULT '#8CC646'::text,
    brand_coral text DEFAULT '#DF4C33'::text,
    brand_orange text DEFAULT '#F5B536'::text,
    brand_teal text DEFAULT '#176884'::text,
    secondary_background text,
    secondary_foreground text,
    theme text DEFAULT 'system'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status_todo_bg text,
    status_in_progress_bg text,
    status_complete_bg text,
    CONSTRAINT user_appearance_settings_theme_check CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role public.app_role DEFAULT 'member'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_room_files data_room_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_files
    ADD CONSTRAINT data_room_files_pkey PRIMARY KEY (id);


--
-- Name: data_room_folders data_room_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_folders
    ADD CONSTRAINT data_room_folders_pkey PRIMARY KEY (id);


--
-- Name: data_room_invites data_room_invites_organization_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_invites
    ADD CONSTRAINT data_room_invites_organization_id_email_key UNIQUE (organization_id, email);


--
-- Name: data_room_invites data_room_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_invites
    ADD CONSTRAINT data_room_invites_pkey PRIMARY KEY (id);


--
-- Name: data_room_nda_signatures data_room_nda_signatures_data_room_id_invite_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_nda_signatures
    ADD CONSTRAINT data_room_nda_signatures_data_room_id_invite_id_key UNIQUE (data_room_id, invite_id);


--
-- Name: data_room_nda_signatures data_room_nda_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_nda_signatures
    ADD CONSTRAINT data_room_nda_signatures_pkey PRIMARY KEY (id);


--
-- Name: data_rooms data_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_rooms
    ADD CONSTRAINT data_rooms_pkey PRIMARY KEY (id);


--
-- Name: drive_file_shares drive_file_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_file_shares
    ADD CONSTRAINT drive_file_shares_pkey PRIMARY KEY (id);


--
-- Name: drive_files drive_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_pkey PRIMARY KEY (id);


--
-- Name: drive_folders drive_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_folders
    ADD CONSTRAINT drive_folders_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: organization_invites organization_invites_organization_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_organization_id_email_key UNIQUE (organization_id, email);


--
-- Name: organization_invites organization_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: personal_checklist_items personal_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_checklist_items
    ADD CONSTRAINT personal_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_task_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_user_id_key UNIQUE (task_id, user_id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_appearance_settings user_appearance_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_appearance_settings
    ADD CONSTRAINT user_appearance_settings_pkey PRIMARY KEY (id);


--
-- Name: user_appearance_settings user_appearance_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_appearance_settings
    ADD CONSTRAINT user_appearance_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: idx_data_room_files_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_room_files_folder ON public.data_room_files USING btree (folder_id);


--
-- Name: idx_data_room_folders_data_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_room_folders_data_room ON public.data_room_folders USING btree (data_room_id);


--
-- Name: idx_data_room_folders_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_room_folders_parent ON public.data_room_folders USING btree (parent_id);


--
-- Name: idx_drive_file_shares_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_file_shares_file_id ON public.drive_file_shares USING btree (file_id);


--
-- Name: idx_drive_file_shares_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_file_shares_share_token ON public.drive_file_shares USING btree (share_token);


--
-- Name: idx_drive_file_shares_shared_with; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_file_shares_shared_with ON public.drive_file_shares USING btree (shared_with);


--
-- Name: idx_drive_files_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_folder ON public.drive_files USING btree (folder_id);


--
-- Name: idx_drive_files_last_viewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_last_viewed ON public.drive_files USING btree (last_viewed_at DESC NULLS LAST);


--
-- Name: idx_drive_files_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_organization ON public.drive_files USING btree (organization_id);


--
-- Name: idx_drive_files_parent_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_parent_file ON public.drive_files USING btree (parent_file_id);


--
-- Name: idx_drive_files_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_files_status ON public.drive_files USING btree (status);


--
-- Name: idx_drive_folders_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_folders_organization ON public.drive_folders USING btree (organization_id);


--
-- Name: idx_drive_folders_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drive_folders_parent ON public.drive_folders USING btree (parent_id);


--
-- Name: idx_profiles_scheduled_deletion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_scheduled_deletion ON public.profiles USING btree (scheduled_deletion_at) WHERE (scheduled_deletion_at IS NOT NULL);


--
-- Name: idx_projects_user_status_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_user_status_position ON public.projects USING btree (user_id, status, "position");


--
-- Name: idx_task_attachments_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_organization_id ON public.task_attachments USING btree (organization_id);


--
-- Name: idx_task_attachments_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments USING btree (task_id);


--
-- Name: idx_tasks_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_user_id ON public.tasks USING btree (assigned_user_id);


--
-- Name: idx_tasks_created_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_by_user_id ON public.tasks USING btree (created_by_user_id);


--
-- Name: idx_tasks_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_deleted_at ON public.tasks USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_position ON public.tasks USING btree (user_id, category, status, "position");


--
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- Name: invoices set_invoice_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_invoice_number_trigger BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();


--
-- Name: data_room_files update_data_room_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_room_files_updated_at BEFORE UPDATE ON public.data_room_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_room_invites update_data_room_invites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_room_invites_updated_at BEFORE UPDATE ON public.data_room_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_rooms update_data_rooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_data_rooms_updated_at BEFORE UPDATE ON public.data_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: personal_checklist_items update_personal_checklist_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_personal_checklist_items_updated_at BEFORE UPDATE ON public.personal_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_appearance_settings update_user_appearance_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_appearance_settings_updated_at BEFORE UPDATE ON public.user_appearance_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: data_room_files data_room_files_data_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_files
    ADD CONSTRAINT data_room_files_data_room_id_fkey FOREIGN KEY (data_room_id) REFERENCES public.data_rooms(id) ON DELETE CASCADE;


--
-- Name: data_room_files data_room_files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_files
    ADD CONSTRAINT data_room_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.data_room_folders(id) ON DELETE SET NULL;


--
-- Name: data_room_files data_room_files_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_files
    ADD CONSTRAINT data_room_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: data_room_files data_room_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_files
    ADD CONSTRAINT data_room_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: data_room_folders data_room_folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_folders
    ADD CONSTRAINT data_room_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: data_room_folders data_room_folders_data_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_folders
    ADD CONSTRAINT data_room_folders_data_room_id_fkey FOREIGN KEY (data_room_id) REFERENCES public.data_rooms(id) ON DELETE CASCADE;


--
-- Name: data_room_folders data_room_folders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_folders
    ADD CONSTRAINT data_room_folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: data_room_folders data_room_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_folders
    ADD CONSTRAINT data_room_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.data_room_folders(id) ON DELETE CASCADE;


--
-- Name: data_room_invites data_room_invites_data_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_invites
    ADD CONSTRAINT data_room_invites_data_room_id_fkey FOREIGN KEY (data_room_id) REFERENCES public.data_rooms(id) ON DELETE CASCADE;


--
-- Name: data_room_invites data_room_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_invites
    ADD CONSTRAINT data_room_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: data_room_invites data_room_invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_invites
    ADD CONSTRAINT data_room_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: data_room_nda_signatures data_room_nda_signatures_data_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_nda_signatures
    ADD CONSTRAINT data_room_nda_signatures_data_room_id_fkey FOREIGN KEY (data_room_id) REFERENCES public.data_rooms(id) ON DELETE CASCADE;


--
-- Name: data_room_nda_signatures data_room_nda_signatures_invite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_room_nda_signatures
    ADD CONSTRAINT data_room_nda_signatures_invite_id_fkey FOREIGN KEY (invite_id) REFERENCES public.data_room_invites(id) ON DELETE CASCADE;


--
-- Name: data_rooms data_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_rooms
    ADD CONSTRAINT data_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: data_rooms data_rooms_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_rooms
    ADD CONSTRAINT data_rooms_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: drive_file_shares drive_file_shares_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_file_shares
    ADD CONSTRAINT drive_file_shares_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.drive_files(id) ON DELETE CASCADE;


--
-- Name: drive_file_shares drive_file_shares_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_file_shares
    ADD CONSTRAINT drive_file_shares_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: drive_file_shares drive_file_shares_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_file_shares
    ADD CONSTRAINT drive_file_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.profiles(id);


--
-- Name: drive_file_shares drive_file_shares_shared_with_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_file_shares
    ADD CONSTRAINT drive_file_shares_shared_with_fkey FOREIGN KEY (shared_with) REFERENCES public.profiles(id);


--
-- Name: drive_files drive_files_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: drive_files drive_files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.drive_folders(id) ON DELETE SET NULL;


--
-- Name: drive_files drive_files_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: drive_files drive_files_parent_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_parent_file_id_fkey FOREIGN KEY (parent_file_id) REFERENCES public.drive_files(id);


--
-- Name: drive_files drive_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_files
    ADD CONSTRAINT drive_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: drive_folders drive_folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_folders
    ADD CONSTRAINT drive_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: drive_folders drive_folders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_folders
    ADD CONSTRAINT drive_folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: drive_folders drive_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drive_folders
    ADD CONSTRAINT drive_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.drive_folders(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: organization_invites organization_invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: personal_checklist_items personal_checklist_items_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_checklist_items
    ADD CONSTRAINT personal_checklist_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: personal_checklist_items personal_checklist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_checklist_items
    ADD CONSTRAINT personal_checklist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: projects projects_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: projects projects_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: user_appearance_settings user_appearance_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_appearance_settings
    ADD CONSTRAINT user_appearance_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects Admins and members can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and members can create projects" ON public.projects FOR INSERT WITH CHECK ((public.is_org_member(auth.uid(), organization_id) AND (NOT public.is_viewer(auth.uid(), organization_id))));


--
-- Name: task_assignments Admins and members can create task assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and members can create task assignments" ON public.task_assignments FOR INSERT WITH CHECK ((public.is_org_member(auth.uid(), public.get_task_organization_id(task_id)) AND (NOT public.is_viewer(auth.uid(), public.get_task_organization_id(task_id)))));


--
-- Name: task_assignments Admins and members can delete task assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and members can delete task assignments" ON public.task_assignments FOR DELETE USING ((public.is_org_member(auth.uid(), public.get_task_organization_id(task_id)) AND (NOT public.is_viewer(auth.uid(), public.get_task_organization_id(task_id)))));


--
-- Name: task_attachments Admins and members can insert attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and members can insert attachments" ON public.task_attachments FOR INSERT WITH CHECK ((public.is_org_member(auth.uid(), organization_id) AND (NOT public.is_viewer(auth.uid(), organization_id))));


--
-- Name: projects Admins and members can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and members can update projects" ON public.projects FOR UPDATE USING ((public.is_org_member(auth.uid(), organization_id) AND (NOT public.is_viewer(auth.uid(), organization_id))));


--
-- Name: organization_invites Admins can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create invites" ON public.organization_invites FOR INSERT WITH CHECK (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: data_rooms Admins can delete data rooms in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete data rooms in their organization" ON public.data_rooms FOR DELETE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: data_room_files Admins can delete files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete files in their organization" ON public.data_room_files FOR DELETE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (uploaded_by = auth.uid())));


--
-- Name: data_room_folders Admins can delete folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete folders in their organization" ON public.data_room_folders FOR DELETE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: data_room_invites Admins can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invites" ON public.data_room_invites FOR DELETE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (invited_by = auth.uid())));


--
-- Name: organization_invites Admins can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invites" ON public.organization_invites FOR DELETE USING (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: projects Admins can delete projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING ((public.is_org_member(auth.uid(), organization_id) AND public.is_admin(auth.uid(), organization_id)));


--
-- Name: user_roles Admins can delete roles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles in their organization" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: tasks Admins can delete tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE USING ((public.is_org_member(auth.uid(), organization_id) AND public.is_admin(auth.uid(), organization_id)));


--
-- Name: organizations Admins can delete their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete their organizations" ON public.organizations FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.organization_id = organizations.id) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_roles Admins can insert roles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles in their organization" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: data_rooms Admins can update data rooms in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update data rooms in their organization" ON public.data_rooms FOR UPDATE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: data_room_files Admins can update files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update files in their organization" ON public.data_room_files FOR UPDATE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (uploaded_by = auth.uid())));


--
-- Name: data_room_folders Admins can update folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update folders in their organization" ON public.data_room_folders FOR UPDATE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: data_room_invites Admins can update invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update invites" ON public.data_room_invites FOR UPDATE USING ((public.has_role(auth.uid(), organization_id, 'admin'::public.app_role) OR (invited_by = auth.uid())));


--
-- Name: organization_invites Admins can update invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update invites" ON public.organization_invites FOR UPDATE USING (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: subscriptions Admins can update organization subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update organization subscription" ON public.subscriptions FOR UPDATE USING (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles in their organization" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: organizations Admins can update their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their organizations" ON public.organizations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.organization_id = organizations.id) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: organization_invites Admins can view invites in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view invites in their organization" ON public.organization_invites FOR SELECT USING (public.has_role(auth.uid(), organization_id, 'admin'::public.app_role));


--
-- Name: organizations Authenticated users can create organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create organizations" ON public.organizations FOR INSERT WITH CHECK (true);


--
-- Name: tasks Members and admins can insert tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members and admins can insert tasks" ON public.tasks FOR INSERT WITH CHECK (((user_id = auth.uid()) AND public.is_org_member(auth.uid(), organization_id) AND (NOT public.is_viewer(auth.uid(), organization_id)) AND ((assigned_user_id IS NULL) OR (public.is_org_member(assigned_user_id, organization_id) AND (public.is_admin(auth.uid(), organization_id) OR (NOT public.is_admin(assigned_user_id, organization_id)))))));


--
-- Name: task_attachments Org members can view attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view attachments" ON public.task_attachments FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: tasks Organization members can update tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can update tasks" ON public.tasks FOR UPDATE USING ((public.is_org_member(auth.uid(), organization_id) AND
CASE
    WHEN public.is_viewer(auth.uid(), organization_id) THEN public.is_assigned_to_task(auth.uid(), id)
    ELSE true
END)) WITH CHECK ((public.is_org_member(auth.uid(), organization_id) AND
CASE
    WHEN public.is_admin(auth.uid(), organization_id) THEN ((assigned_user_id IS NULL) OR public.is_org_member(assigned_user_id, organization_id))
    WHEN public.is_viewer(auth.uid(), organization_id) THEN public.is_assigned_to_task(auth.uid(), id)
    ELSE ((assigned_user_id IS NULL) OR (public.is_org_member(assigned_user_id, organization_id) AND (NOT public.is_admin(assigned_user_id, organization_id))))
END));


--
-- Name: data_room_nda_signatures Service role can insert NDA signatures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert NDA signatures" ON public.data_room_nda_signatures FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: task_attachments Uploaders or admins can delete attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Uploaders or admins can delete attachments" ON public.task_attachments FOR DELETE USING (((uploaded_by = auth.uid()) OR public.is_admin(auth.uid(), organization_id)));


--
-- Name: data_rooms Users can create data rooms in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create data rooms in their organization" ON public.data_rooms FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: drive_files Users can create files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create files in their organization" ON public.drive_files FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: data_room_folders Users can create folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create folders in their organization" ON public.data_room_folders FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: drive_folders Users can create folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create folders in their organization" ON public.drive_folders FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: data_room_invites Users can create invites for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create invites for their organization" ON public.data_room_invites FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: drive_file_shares Users can create shares in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create shares in their organization" ON public.drive_file_shares FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: personal_checklist_items Users can create their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own checklist items" ON public.personal_checklist_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can create their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: drive_files Users can delete files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete files in their organization" ON public.drive_files FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: drive_folders Users can delete folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete folders in their organization" ON public.drive_folders FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: drive_file_shares Users can delete shares they created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete shares they created" ON public.drive_file_shares FOR DELETE USING (((shared_by = auth.uid()) OR public.has_role(auth.uid(), organization_id, 'admin'::public.app_role)));


--
-- Name: user_appearance_settings Users can delete their own appearance settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own appearance settings" ON public.user_appearance_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: personal_checklist_items Users can delete their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own checklist items" ON public.personal_checklist_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING ((id = auth.uid()));


--
-- Name: user_appearance_settings Users can insert their own appearance settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own appearance settings" ON public.user_appearance_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: drive_files Users can update files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update files in their organization" ON public.drive_files FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: drive_folders Users can update folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update folders in their organization" ON public.drive_folders FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: drive_file_shares Users can update shares they created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update shares they created" ON public.drive_file_shares FOR UPDATE USING (((shared_by = auth.uid()) OR public.has_role(auth.uid(), organization_id, 'admin'::public.app_role)));


--
-- Name: user_appearance_settings Users can update their own appearance settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own appearance settings" ON public.user_appearance_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: personal_checklist_items Users can update their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own checklist items" ON public.personal_checklist_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid()));


--
-- Name: data_room_files Users can upload files to their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload files to their organization" ON public.data_room_files FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: data_room_nda_signatures Users can view NDA signatures in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view NDA signatures in their organization" ON public.data_room_nda_signatures FOR SELECT USING ((data_room_id IN ( SELECT dr.id
   FROM public.data_rooms dr
  WHERE (dr.organization_id = public.get_user_organization_id(auth.uid())))));


--
-- Name: data_rooms Users can view data rooms in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view data rooms in their organization" ON public.data_rooms FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: data_room_files Users can view files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view files in their organization" ON public.data_room_files FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: drive_files Users can view files in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view files in their organization" ON public.drive_files FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: data_room_folders Users can view folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view folders in their organization" ON public.data_room_folders FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: drive_folders Users can view folders in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view folders in their organization" ON public.drive_folders FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: data_room_invites Users can view invites in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invites in their organization" ON public.data_room_invites FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: organizations Users can view organizations they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view organizations they belong to" ON public.organizations FOR SELECT USING ((id IN ( SELECT user_roles.organization_id
   FROM public.user_roles
  WHERE (user_roles.user_id = auth.uid()))));


--
-- Name: profiles Users can view profiles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles in their organization" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR (organization_id IN ( SELECT ur.organization_id
   FROM public.user_roles ur
  WHERE (ur.user_id = auth.uid())))));


--
-- Name: projects Users can view projects based on role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view projects based on role" ON public.projects FOR SELECT USING ((public.is_org_member(auth.uid(), organization_id) AND
CASE
    WHEN public.is_viewer(auth.uid(), organization_id) THEN ((assigned_user_id = auth.uid()) OR (EXISTS ( SELECT 1
       FROM public.tasks t
      WHERE ((t.project_id = projects.id) AND (t.deleted_at IS NULL) AND public.is_assigned_to_task(auth.uid(), t.id)))))
    ELSE true
END));


--
-- Name: user_roles Users can view roles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view roles in their organization" ON public.user_roles FOR SELECT USING (((user_id = auth.uid()) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: drive_file_shares Users can view shares in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shares in their organization" ON public.drive_file_shares FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: task_assignments Users can view task assignments in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view task assignments in their org" ON public.task_assignments FOR SELECT USING (public.is_org_member(auth.uid(), public.get_task_organization_id(task_id)));


--
-- Name: tasks Users can view tasks based on role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks based on role" ON public.tasks FOR SELECT USING ((public.is_org_member(auth.uid(), organization_id) AND
CASE
    WHEN public.is_viewer(auth.uid(), organization_id) THEN public.is_assigned_to_task(auth.uid(), id)
    ELSE true
END));


--
-- Name: invoices Users can view their organization invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization invoices" ON public.invoices FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: subscriptions Users can view their organization subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization subscription" ON public.subscriptions FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: user_appearance_settings Users can view their own appearance settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own appearance settings" ON public.user_appearance_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: personal_checklist_items Users can view their own checklist items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own checklist items" ON public.personal_checklist_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: data_room_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_room_files ENABLE ROW LEVEL SECURITY;

--
-- Name: data_room_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_room_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: data_room_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_room_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: data_room_nda_signatures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_room_nda_signatures ENABLE ROW LEVEL SECURITY;

--
-- Name: data_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: drive_file_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drive_file_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: drive_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

--
-- Name: drive_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_checklist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_checklist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: task_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_appearance_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_appearance_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;