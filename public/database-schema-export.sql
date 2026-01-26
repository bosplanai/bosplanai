-- =====================================================
-- BOSPLAN DATABASE SCHEMA EXPORT
-- Generated: 2026-01-26
-- Tables: 78 | RLS Policies: 258
-- IMPORTANT: Run in order - Types, Tables, Functions, then Policies
-- =====================================================

-- =====================================================
-- PART 1: CUSTOM TYPES/ENUMS (Run First)
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer', 'super_admin');
CREATE TYPE public.template_category AS ENUM ('general', 'business', 'marketing', 'hr', 'finance', 'operations');
CREATE TYPE public.template_type AS ENUM ('task', 'document');

-- =====================================================
-- PART 2: CORE TABLES (Run Second - Before Functions)
-- =====================================================

-- Organizations
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  employee_size text NOT NULL,
  logo_url text,
  is_suspended boolean NOT NULL DEFAULT false,
  suspended_at timestamp with time zone,
  suspended_by uuid,
  suspension_reason text,
  scheduled_deletion_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  job_role text NOT NULL,
  phone_number text NOT NULL,
  is_virtual_assistant boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  scheduled_deletion_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User Roles (MUST be created before helper functions)
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trialing',
  plan_type text NOT NULL DEFAULT 'monthly',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamp with time zone,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  base_user_count integer NOT NULL DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES auth.users(id),
  assigned_user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  position integer NOT NULL DEFAULT 0,
  due_date date,
  archived_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES auth.users(id),
  assigned_user_id uuid REFERENCES auth.users(id),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'operational',
  subcategory text NOT NULL DEFAULT 'weekly',
  icon text NOT NULL DEFAULT 'ListTodo',
  position integer NOT NULL DEFAULT 0,
  due_date date,
  is_recurring boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT false,
  attachment_url text,
  attachment_name text,
  assignment_status text NOT NULL DEFAULT 'accepted',
  assignment_responded_at timestamp with time zone,
  decline_reason text,
  last_reminder_sent_at timestamp with time zone,
  completed_at timestamp with time zone,
  archived_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Task Assignments
CREATE TABLE public.task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Task Notes
CREATE TABLE public.task_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Task URLs
CREATE TABLE public.task_urls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Task Attachments
CREATE TABLE public.task_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Project Attachments
CREATE TABLE public.project_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  reference_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Organization Invites
CREATE TABLE public.organization_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Customers (CRM)
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text,
  mobile text,
  address text,
  notes text,
  status text DEFAULT 'active',
  enquiry_source text,
  additional_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- CRM Activities
CREATE TABLE public.crm_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_number character varying NOT NULL,
  subject text NOT NULL,
  description text,
  type character varying,
  status character varying NOT NULL DEFAULT 'not_started',
  priority character varying NOT NULL DEFAULT 'normal',
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- CRM Cases
CREATE TABLE public.crm_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  case_number text NOT NULL,
  subject text NOT NULL,
  description text,
  type text,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'medium',
  case_origin text,
  product_name text,
  reported_by text,
  email text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- CRM Meetings
CREATE TABLE public.crm_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meeting_number text NOT NULL,
  title text NOT NULL,
  description text,
  meeting_venue text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive Folders (create before drive_files for self-reference)
CREATE TABLE public.drive_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.drive_folders(id),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive Files
CREATE TABLE public.drive_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  signed_by uuid REFERENCES auth.users(id),
  folder_id uuid REFERENCES public.drive_folders(id),
  parent_file_id uuid REFERENCES public.drive_files(id),
  name text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  file_category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'not_started',
  version integer NOT NULL DEFAULT 1,
  is_restricted boolean DEFAULT false,
  requires_signature boolean DEFAULT false,
  signature_status text,
  signed_at timestamp with time zone,
  last_viewed_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive Document Content
CREATE TABLE public.drive_document_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL UNIQUE REFERENCES public.drive_files(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'rich_text',
  last_edited_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive Document Versions
CREATE TABLE public.drive_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.drive_document_content(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  version_note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive Document Presence
CREATE TABLE public.drive_document_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cursor_position integer,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive File Access
CREATE TABLE public.drive_file_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_to uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Drive File Shares
CREATE TABLE public.drive_file_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view',
  is_link_share boolean NOT NULL DEFAULT false,
  share_token uuid DEFAULT gen_random_uuid(),
  link_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Rooms
CREATE TABLE public.data_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  nda_required boolean NOT NULL DEFAULT false,
  nda_content text,
  nda_content_hash text,
  archived_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Members
CREATE TABLE public.data_room_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(data_room_id, user_id)
);

-- Data Room Invites
CREATE TABLE public.data_room_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  guest_name text,
  access_id text,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  nda_signed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Folders (create before data_room_files)
CREATE TABLE public.data_room_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.data_room_folders(id),
  name text NOT NULL,
  is_restricted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Files
CREATE TABLE public.data_room_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_uploaded_by uuid REFERENCES public.data_room_invites(id),
  folder_id uuid REFERENCES public.data_room_folders(id),
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  permission text NOT NULL DEFAULT 'view',
  is_restricted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room File Permissions
CREATE TABLE public.data_room_file_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_invite_id uuid REFERENCES public.data_room_invites(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Folder Permissions
CREATE TABLE public.data_room_folder_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid NOT NULL REFERENCES public.data_room_folders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_invite_id uuid REFERENCES public.data_room_invites(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room NDA Signatures
CREATE TABLE public.data_room_nda_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  invite_id uuid REFERENCES public.data_room_invites(id),
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  nda_content_hash text NOT NULL,
  signature_url text,
  ip_address text,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Messages
CREATE TABLE public.data_room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  message text NOT NULL,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Activity
CREATE TABLE public.data_room_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  user_email text NOT NULL,
  action text NOT NULL,
  details jsonb,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room File Comments
CREATE TABLE public.data_room_file_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  commenter_id uuid REFERENCES auth.users(id),
  commenter_name text NOT NULL,
  commenter_email text NOT NULL,
  comment text NOT NULL,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Document Content
CREATE TABLE public.data_room_document_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL UNIQUE REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'rich_text',
  last_edited_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Document Versions
CREATE TABLE public.data_room_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.data_room_document_content(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  data_room_id uuid NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  version_note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Data Room Document Presence
CREATE TABLE public.data_room_document_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid NOT NULL REFERENCES public.data_room_files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cursor_position integer,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'usd',
  amount_due integer NOT NULL,
  amount_paid integer NOT NULL DEFAULT 0,
  terms text DEFAULT 'receipt',
  terms_conditions text,
  customer_notes text,
  invoice_date timestamp with time zone DEFAULT now(),
  due_date timestamp with time zone,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  paid_at timestamp with time zone,
  pdf_url text,
  stripe_invoice_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Invoice Line Items
CREATE TABLE public.invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percent',
  vat text NOT NULL DEFAULT 'none',
  amount numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Invoice Payments
CREATE TABLE public.invoice_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  payment_method text NOT NULL,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Invoice Settings
CREATE TABLE public.invoice_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_name text,
  business_address text,
  business_email text,
  business_phone text,
  business_website text,
  logo_url text,
  tax_number text,
  tax_label text DEFAULT 'VAT',
  tax_rate numeric DEFAULT 20,
  currency text DEFAULT 'GBP',
  location text DEFAULT 'GB',
  primary_color text DEFAULT '#1B9AAA',
  secondary_color text DEFAULT '#E0523A',
  invoice_prefix text DEFAULT 'INV-',
  default_payment_terms text DEFAULT '30',
  financial_year_start text DEFAULT 'april',
  footer_note text,
  terms_and_conditions_url text,
  show_logo boolean DEFAULT true,
  show_tax_number boolean DEFAULT true,
  show_payment_terms boolean DEFAULT true,
  enable_reminders boolean DEFAULT true,
  reminder_before_due integer DEFAULT 3,
  reminder_on_due boolean DEFAULT true,
  reminder_after_due integer DEFAULT 7,
  max_reminders integer DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Invoice Products
CREATE TABLE public.invoice_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_rate numeric NOT NULL DEFAULT 0,
  default_vat text NOT NULL DEFAULT 'none',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helpdesk Settings
CREATE TABLE public.helpdesk_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name text,
  logo_url text,
  support_email text,
  support_phone text,
  primary_color text DEFAULT '#1B9AAA',
  secondary_color text DEFAULT '#E0523A',
  timezone text DEFAULT 'Europe/London',
  business_hours_start text DEFAULT '09:00',
  business_hours_end text DEFAULT '17:00',
  working_days text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  portal_slug text,
  portal_enabled boolean DEFAULT true,
  show_name_field boolean DEFAULT true,
  show_email_field boolean DEFAULT true,
  show_phone_field boolean DEFAULT true,
  show_details_field boolean DEFAULT true,
  show_attachment_field boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helpdesk Tickets
CREATE TABLE public.helpdesk_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  ticket_number text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  subject text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  channel text NOT NULL DEFAULT 'web',
  attachment_url text,
  attachment_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helpdesk Ticket Responses
CREATE TABLE public.helpdesk_ticket_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  email_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helpdesk Response Attachments
CREATE TABLE public.helpdesk_response_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES public.helpdesk_ticket_responses(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helpdesk Response Templates
CREATE TABLE public.helpdesk_response_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Policies
CREATE TABLE public.policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  category text NOT NULL DEFAULT 'general',
  version integer NOT NULL DEFAULT 1,
  expiry_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Policy Versions
CREATE TABLE public.policy_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  version_note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Policy Attachments
CREATE TABLE public.policy_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Templates
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid,
  name text NOT NULL,
  description text,
  content text NOT NULL DEFAULT '',
  template_type text NOT NULL DEFAULT 'document',
  category text NOT NULL DEFAULT 'general',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Template Folders
CREATE TABLE public.template_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.template_folders(id),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Template Versions
CREATE TABLE public.template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  version_note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Bosplan Templates (System templates)
CREATE TABLE public.bosplan_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  template_type text NOT NULL DEFAULT 'document',
  file_name text,
  file_path text,
  file_size integer,
  mime_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI Usage Limits
CREATE TABLE public.ai_usage_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  limit_type text NOT NULL,
  max_prompts integer NOT NULL DEFAULT 100,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI Usage Tracking
CREATE TABLE public.ai_usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_count integer NOT NULL DEFAULT 0,
  period_type text NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, period_type, period_start)
);

-- Feature Usage Logs
CREATE TABLE public.feature_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES public.organizations(id),
  feature_name text NOT NULL,
  feature_category text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User Signatures
CREATE TABLE public.user_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  signature_url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Personal Checklists
CREATE TABLE public.personal_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Calendar Events
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  color text DEFAULT '#1B9AAA',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Specialist Plans
CREATE TABLE public.specialist_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  duration_months integer NOT NULL DEFAULT 12,
  max_users integer NOT NULL DEFAULT 10,
  terms_and_conditions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Registration Links
CREATE TABLE public.registration_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.specialist_plans(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Organization Specialist Plans
CREATE TABLE public.organization_specialist_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.specialist_plans(id) ON DELETE CASCADE,
  referral_code text,
  agreed_to_terms boolean NOT NULL DEFAULT false,
  agreed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Virtual Assistant Pricing
CREATE TABLE public.virtual_assistant_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_per_month numeric NOT NULL DEFAULT 0,
  stripe_price_id text,
  features jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- VA Subscriptions
CREATE TABLE public.va_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  virtual_assistant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Dataroom Storage Purchases
CREATE TABLE public.dataroom_storage_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL,
  price_id text NOT NULL,
  storage_gb integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Storage Purchases
CREATE TABLE public.storage_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL,
  price_id text NOT NULL,
  storage_gb integer NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add sequences for auto-numbered fields
CREATE SEQUENCE IF NOT EXISTS public.activity_number_seq START 1;

-- =====================================================
-- PART 3: HELPER FUNCTIONS (Run Third - After Tables)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_viewer(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _org_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid, _org_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND organization_id = _org_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_task_organization_id(_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.tasks WHERE id = _task_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.is_file_owner(_file_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM drive_files 
    WHERE id = _file_id AND uploaded_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_data_room_organization_id(p_data_room_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id 
  FROM public.data_rooms 
  WHERE id = p_data_room_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_data_room(p_data_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nda_required boolean;
  v_nda_content_hash text;
  v_owner uuid;
  v_signature_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT dr.nda_required, dr.created_by, dr.nda_content_hash
    INTO v_nda_required, v_owner, v_nda_content_hash
  FROM public.data_rooms dr
  WHERE dr.id = p_data_room_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_owner = auth.uid() THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.data_room_members m
    WHERE m.data_room_id = p_data_room_id
      AND m.user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  IF v_nda_required IS NOT TRUE THEN
    RETURN true;
  END IF;

  SELECT s.nda_content_hash INTO v_signature_hash
  FROM public.data_room_nda_signatures s
  WHERE s.data_room_id = p_data_room_id
    AND s.user_id = auth.uid()
  ORDER BY s.signed_at DESC
  LIMIT 1;

  IF v_signature_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_nda_content_hash IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_signature_hash = v_nda_content_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_org_slug(org_name text)
RETURNS text
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

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
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

CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
BEGIN
  year_month := to_char(now(), 'YYYYMM');
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 6) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM crm_cases
  WHERE case_number LIKE 'CASE-' || year_month || '%';
  
  RETURN 'CASE-' || year_month || '-' || LPAD(seq_num::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_meeting_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(meeting_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.crm_meetings;
  RETURN 'MTG' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_helpdesk_ticket_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 2) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.helpdesk_tickets;
  RETURN '#' || LPAD(next_num::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_activity_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.activity_number := 'ACT-' || LPAD(NEXTVAL('public.activity_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_access_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_id TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_id := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM data_room_invites WHERE access_id = new_id) INTO exists_check;
    IF NOT exists_check THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_document_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_document_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_file_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_folder_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_nda_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_file_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_document_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_response_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bosplan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_specialist_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_assistant_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.va_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataroom_storage_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_purchases ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 5: RLS POLICIES
-- =====================================================

-- Organizations Policies
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update their organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid(), id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can do anything with organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Profiles Policies
CREATE POLICY "Users can view profiles in their org" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User Roles Policies
CREATE POLICY "Users can view roles in their org" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

-- Subscriptions Policies
CREATE POLICY "Org members can view subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

-- Projects Policies
CREATE POLICY "Org members can view projects" ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- Tasks Policies
CREATE POLICY "Org members can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

CREATE POLICY "Assigned users and non-viewers can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id) AND 
    (NOT public.is_viewer(auth.uid(), organization_id) OR public.is_assigned_to_task(auth.uid(), id))
  );

CREATE POLICY "Admins and creators can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid(), organization_id) OR created_by_user_id = auth.uid());

-- Task Assignments Policies
CREATE POLICY "Org members can view task assignments" ON public.task_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

CREATE POLICY "Non-viewers can manage task assignments" ON public.task_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id AND public.is_org_member(auth.uid(), t.organization_id) 
      AND NOT public.is_viewer(auth.uid(), t.organization_id)
    )
  );

-- Task Notes Policies
CREATE POLICY "Org members can view task notes" ON public.task_notes
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can create task notes" ON public.task_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

CREATE POLICY "Users can update their own notes" ON public.task_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes" ON public.task_notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid(), organization_id));

-- Task URLs Policies
CREATE POLICY "Org members can view task URLs" ON public.task_urls
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage task URLs" ON public.task_urls
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Task Attachments Policies
CREATE POLICY "Org members can view task attachments" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage task attachments" ON public.task_attachments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Project Attachments Policies
CREATE POLICY "Org members can view project attachments" ON public.project_attachments
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage project attachments" ON public.project_attachments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Organization Invites Policies
CREATE POLICY "Admins can view invites" ON public.organization_invites
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can manage invites" ON public.organization_invites
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- Customers Policies
CREATE POLICY "Org members can view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- CRM Activities Policies
CREATE POLICY "Org members can view activities" ON public.crm_activities
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage activities" ON public.crm_activities
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- CRM Cases Policies
CREATE POLICY "Org members can view cases" ON public.crm_cases
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage cases" ON public.crm_cases
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- CRM Meetings Policies
CREATE POLICY "Org members can view meetings" ON public.crm_meetings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage meetings" ON public.crm_meetings
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Drive Files Policies
CREATE POLICY "Org members can view files" ON public.drive_files
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage files" ON public.drive_files
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Drive Folders Policies
CREATE POLICY "Org members can view folders" ON public.drive_folders
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage folders" ON public.drive_folders
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Drive Document Content Policies
CREATE POLICY "Users can view document content" ON public.drive_document_content
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drive_files f 
      WHERE f.id = file_id AND public.is_org_member(auth.uid(), f.organization_id)
    )
  );

CREATE POLICY "Non-viewers can manage document content" ON public.drive_document_content
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drive_files f 
      WHERE f.id = file_id AND public.is_org_member(auth.uid(), f.organization_id)
      AND NOT public.is_viewer(auth.uid(), f.organization_id)
    )
  );

-- Drive Document Versions Policies
CREATE POLICY "Users can view document versions" ON public.drive_document_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drive_files f 
      WHERE f.id = file_id AND public.is_org_member(auth.uid(), f.organization_id)
    )
  );

CREATE POLICY "Non-viewers can manage document versions" ON public.drive_document_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drive_files f 
      WHERE f.id = file_id AND public.is_org_member(auth.uid(), f.organization_id)
      AND NOT public.is_viewer(auth.uid(), f.organization_id)
    )
  );

-- Drive Document Presence Policies
CREATE POLICY "Users can manage their own presence" ON public.drive_document_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view presence" ON public.drive_document_presence
  FOR SELECT TO authenticated
  USING (true);

-- Drive File Access Policies
CREATE POLICY "Users can view file access" ON public.drive_file_access
  FOR SELECT TO authenticated
  USING (granted_to = auth.uid() OR granted_by = auth.uid());

CREATE POLICY "File owners can manage access" ON public.drive_file_access
  FOR ALL TO authenticated
  USING (granted_by = auth.uid() OR public.is_file_owner(file_id, auth.uid()));

-- Drive File Shares Policies
CREATE POLICY "Users can view shares" ON public.drive_file_shares
  FOR SELECT TO authenticated
  USING (shared_by = auth.uid() OR shared_with = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage shares" ON public.drive_file_shares
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Rooms Policies
CREATE POLICY "Users can view accessible data rooms" ON public.data_rooms
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR created_by = auth.uid());

CREATE POLICY "Non-viewers can manage data rooms" ON public.data_rooms
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room Members Policies
CREATE POLICY "Users can view data room members" ON public.data_room_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR user_id = auth.uid());

CREATE POLICY "Non-viewers can manage data room members" ON public.data_room_members
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room Invites Policies
CREATE POLICY "Org members can view invites" ON public.data_room_invites
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage invites" ON public.data_room_invites
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room Files Policies
CREATE POLICY "Users with access can view files" ON public.data_room_files
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

CREATE POLICY "Non-viewers can manage files" ON public.data_room_files
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room Folders Policies
CREATE POLICY "Users with access can view folders" ON public.data_room_folders
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

CREATE POLICY "Non-viewers can manage folders" ON public.data_room_folders
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room File Permissions Policies
CREATE POLICY "Users can view file permissions" ON public.data_room_file_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage file permissions" ON public.data_room_file_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.data_room_files f 
      WHERE f.id = file_id AND public.is_admin(auth.uid(), f.organization_id)
    )
  );

-- Data Room Folder Permissions Policies
CREATE POLICY "Users can view folder permissions" ON public.data_room_folder_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage folder permissions" ON public.data_room_folder_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.data_room_folders f 
      WHERE f.id = folder_id AND public.is_admin(auth.uid(), f.organization_id)
    )
  );

-- Data Room NDA Signatures Policies
CREATE POLICY "Users can view NDA signatures" ON public.data_room_nda_signatures
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), public.get_data_room_organization_id(data_room_id)));

CREATE POLICY "Users can create signatures" ON public.data_room_nda_signatures
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Data Room Messages Policies
CREATE POLICY "Users with access can view messages" ON public.data_room_messages
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users with access can send messages" ON public.data_room_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

-- Data Room Activity Policies
CREATE POLICY "Org members can view activity" ON public.data_room_activity
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can log activity" ON public.data_room_activity
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Data Room File Comments Policies
CREATE POLICY "Users with access can view comments" ON public.data_room_file_comments
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

CREATE POLICY "Users with access can add comments" ON public.data_room_file_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

-- Data Room Document Content Policies
CREATE POLICY "Users with access can view content" ON public.data_room_document_content
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.user_can_access_data_room(data_room_id));

CREATE POLICY "Non-viewers can manage content" ON public.data_room_document_content
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room Document Versions Policies
CREATE POLICY "Users with access can view versions" ON public.data_room_document_versions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage versions" ON public.data_room_document_versions
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Data Room Document Presence Policies
CREATE POLICY "Users can manage their presence" ON public.data_room_document_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view presence" ON public.data_room_document_presence
  FOR SELECT TO authenticated
  USING (true);

-- Invoices Policies
CREATE POLICY "Org members can view invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Invoice Line Items Policies
CREATE POLICY "Users can view invoice line items" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.id = invoice_id AND public.is_org_member(auth.uid(), i.organization_id)
    )
  );

CREATE POLICY "Non-viewers can manage line items" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.id = invoice_id AND public.is_org_member(auth.uid(), i.organization_id)
      AND NOT public.is_viewer(auth.uid(), i.organization_id)
    )
  );

-- Invoice Payments Policies
CREATE POLICY "Org members can view payments" ON public.invoice_payments
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage payments" ON public.invoice_payments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Invoice Settings Policies
CREATE POLICY "Org members can view invoice settings" ON public.invoice_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage invoice settings" ON public.invoice_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- Invoice Products Policies
CREATE POLICY "Org members can view products" ON public.invoice_products
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage products" ON public.invoice_products
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Helpdesk Settings Policies
CREATE POLICY "Org members can view helpdesk settings" ON public.helpdesk_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage helpdesk settings" ON public.helpdesk_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- Helpdesk Tickets Policies
CREATE POLICY "Org members can view tickets" ON public.helpdesk_tickets
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage tickets" ON public.helpdesk_tickets
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Helpdesk Ticket Responses Policies
CREATE POLICY "Org members can view responses" ON public.helpdesk_ticket_responses
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage responses" ON public.helpdesk_ticket_responses
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Helpdesk Response Attachments Policies
CREATE POLICY "Org members can view attachments" ON public.helpdesk_response_attachments
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage attachments" ON public.helpdesk_response_attachments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Helpdesk Response Templates Policies
CREATE POLICY "Org members can view templates" ON public.helpdesk_response_templates
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage templates" ON public.helpdesk_response_templates
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Policies Table Policies
CREATE POLICY "Org members can view policies" ON public.policies
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage policies" ON public.policies
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Policy Versions Policies
CREATE POLICY "Org members can view policy versions" ON public.policy_versions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage policy versions" ON public.policy_versions
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Policy Attachments Policies
CREATE POLICY "Org members can view policy attachments" ON public.policy_attachments
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage policy attachments" ON public.policy_attachments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Templates Policies
CREATE POLICY "Org members can view templates" ON public.templates
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage templates" ON public.templates
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Template Folders Policies
CREATE POLICY "Org members can view template folders" ON public.template_folders
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage template folders" ON public.template_folders
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Template Versions Policies
CREATE POLICY "Org members can view template versions" ON public.template_versions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Non-viewers can manage template versions" ON public.template_versions
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) AND NOT public.is_viewer(auth.uid(), organization_id));

-- Bosplan Templates Policies (System templates - read only for most users)
CREATE POLICY "Anyone can view active bosplan templates" ON public.bosplan_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage bosplan templates" ON public.bosplan_templates
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- AI Usage Limits Policies
CREATE POLICY "Anyone can view AI limits" ON public.ai_usage_limits
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage AI limits" ON public.ai_usage_limits
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- AI Usage Tracking Policies
CREATE POLICY "Org members can view their usage" ON public.ai_usage_tracking
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can manage usage tracking" ON public.ai_usage_tracking
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Feature Usage Logs Policies
CREATE POLICY "Users can view their logs" ON public.feature_usage_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)));

CREATE POLICY "Users can create logs" ON public.feature_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User Signatures Policies
CREATE POLICY "Users can view their signatures" ON public.user_signatures
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage their signatures" ON public.user_signatures
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Personal Checklists Policies
CREATE POLICY "Users can view their checklists" ON public.personal_checklists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their checklists" ON public.personal_checklists
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Calendar Events Policies
CREATE POLICY "Users can view their events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage their events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Specialist Plans Policies
CREATE POLICY "Anyone can view active plans" ON public.specialist_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage plans" ON public.specialist_plans
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Registration Links Policies
CREATE POLICY "Super admins can manage registration links" ON public.registration_links
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Organization Specialist Plans Policies
CREATE POLICY "Org members can view their specialist plan" ON public.organization_specialist_plans
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage specialist plans" ON public.organization_specialist_plans
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Virtual Assistant Pricing Policies
CREATE POLICY "Anyone can view active pricing" ON public.virtual_assistant_pricing
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage pricing" ON public.virtual_assistant_pricing
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- VA Subscriptions Policies
CREATE POLICY "Org members can view VA subscriptions" ON public.va_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage VA subscriptions" ON public.va_subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- Dataroom Storage Purchases Policies
CREATE POLICY "Org members can view purchases" ON public.dataroom_storage_purchases
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage purchases" ON public.dataroom_storage_purchases
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- Storage Purchases Policies
CREATE POLICY "Org members can view storage purchases" ON public.storage_purchases
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage storage purchases" ON public.storage_purchases
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid(), organization_id));

-- =====================================================
-- PART 6: TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_notes_updated_at BEFORE UPDATE ON public.task_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_activities_updated_at BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_cases_updated_at BEFORE UPDATE ON public.crm_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_meetings_updated_at BEFORE UPDATE ON public.crm_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drive_files_updated_at BEFORE UPDATE ON public.drive_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drive_folders_updated_at BEFORE UPDATE ON public.drive_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drive_document_content_updated_at BEFORE UPDATE ON public.drive_document_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drive_file_shares_updated_at BEFORE UPDATE ON public.drive_file_shares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_rooms_updated_at BEFORE UPDATE ON public.data_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_room_invites_updated_at BEFORE UPDATE ON public.data_room_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_room_files_updated_at BEFORE UPDATE ON public.data_room_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_room_folders_updated_at BEFORE UPDATE ON public.data_room_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_data_room_document_content_updated_at BEFORE UPDATE ON public.data_room_document_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_settings_updated_at BEFORE UPDATE ON public.invoice_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_products_updated_at BEFORE UPDATE ON public.invoice_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_helpdesk_settings_updated_at BEFORE UPDATE ON public.helpdesk_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_helpdesk_tickets_updated_at BEFORE UPDATE ON public.helpdesk_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_helpdesk_response_templates_updated_at BEFORE UPDATE ON public.helpdesk_response_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_template_folders_updated_at BEFORE UPDATE ON public.template_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bosplan_templates_updated_at BEFORE UPDATE ON public.bosplan_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_usage_limits_updated_at BEFORE UPDATE ON public.ai_usage_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_usage_tracking_updated_at BEFORE UPDATE ON public.ai_usage_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_signatures_updated_at BEFORE UPDATE ON public.user_signatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_personal_checklists_updated_at BEFORE UPDATE ON public.personal_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_specialist_plans_updated_at BEFORE UPDATE ON public.specialist_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_registration_links_updated_at BEFORE UPDATE ON public.registration_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organization_specialist_plans_updated_at BEFORE UPDATE ON public.organization_specialist_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_virtual_assistant_pricing_updated_at BEFORE UPDATE ON public.virtual_assistant_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_va_subscriptions_updated_at BEFORE UPDATE ON public.va_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dataroom_storage_purchases_updated_at BEFORE UPDATE ON public.dataroom_storage_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_storage_purchases_updated_at BEFORE UPDATE ON public.storage_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-number triggers
CREATE TRIGGER set_activity_number BEFORE INSERT ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.generate_activity_number();

-- =====================================================
-- END OF SCHEMA EXPORT
-- =====================================================
