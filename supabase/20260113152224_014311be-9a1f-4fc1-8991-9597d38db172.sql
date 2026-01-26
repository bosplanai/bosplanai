-- Create helpdesk_settings table for organization-specific settings
CREATE TABLE public.helpdesk_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Company settings
  company_name TEXT,
  support_email TEXT,
  support_phone TEXT,
  timezone TEXT DEFAULT 'Europe/London',
  business_hours_start TEXT DEFAULT '09:00',
  business_hours_end TEXT DEFAULT '17:00',
  working_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1B9AAA',
  secondary_color TEXT DEFAULT '#E0523A',
  
  -- Portal settings
  portal_slug TEXT UNIQUE,
  portal_enabled BOOLEAN DEFAULT true,
  
  -- Form field toggles
  show_name_field BOOLEAN DEFAULT true,
  show_email_field BOOLEAN DEFAULT true,
  show_phone_field BOOLEAN DEFAULT true,
  show_details_field BOOLEAN DEFAULT true,
  show_attachment_field BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Create helpdesk_tickets table
CREATE TABLE public.helpdesk_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  
  -- Submitter info
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Ticket content
  subject TEXT NOT NULL,
  details TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  
  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'closed')),
  channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'email', 'phone')),
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.helpdesk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for helpdesk_settings
CREATE POLICY "Organization members can view helpdesk settings"
ON public.helpdesk_settings
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert helpdesk settings"
ON public.helpdesk_settings
FOR INSERT
WITH CHECK (is_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update helpdesk settings"
ON public.helpdesk_settings
FOR UPDATE
USING (is_admin(auth.uid(), organization_id));

-- RLS policies for helpdesk_tickets
CREATE POLICY "Organization members can view tickets"
ON public.helpdesk_tickets
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can insert tickets"
ON public.helpdesk_tickets
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND NOT is_viewer(auth.uid(), organization_id));

CREATE POLICY "Organization members can update tickets"
ON public.helpdesk_tickets
FOR UPDATE
USING (is_org_member(auth.uid(), organization_id) AND NOT is_viewer(auth.uid(), organization_id));

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_helpdesk_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_helpdesk_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_helpdesk_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_helpdesk_ticket_number_trigger
BEFORE INSERT ON public.helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_helpdesk_ticket_number();

-- Trigger for updated_at
CREATE TRIGGER update_helpdesk_settings_updated_at
BEFORE UPDATE ON public.helpdesk_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_tickets_updated_at
BEFORE UPDATE ON public.helpdesk_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get helpdesk settings by portal slug (public access)
CREATE OR REPLACE FUNCTION public.get_helpdesk_by_slug(_slug TEXT)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  portal_enabled BOOLEAN,
  show_name_field BOOLEAN,
  show_email_field BOOLEAN,
  show_phone_field BOOLEAN,
  show_details_field BOOLEAN,
  show_attachment_field BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    hs.id,
    hs.organization_id,
    hs.company_name,
    hs.logo_url,
    hs.primary_color,
    hs.secondary_color,
    hs.portal_enabled,
    hs.show_name_field,
    hs.show_email_field,
    hs.show_phone_field,
    hs.show_details_field,
    hs.show_attachment_field
  FROM helpdesk_settings hs
  WHERE hs.portal_slug = _slug
    AND hs.portal_enabled = true
  LIMIT 1;
$$;

-- Function to submit a ticket (public access)
CREATE OR REPLACE FUNCTION public.submit_helpdesk_ticket(
  _organization_id UUID,
  _subject TEXT,
  _contact_name TEXT DEFAULT NULL,
  _contact_email TEXT DEFAULT NULL,
  _contact_phone TEXT DEFAULT NULL,
  _details TEXT DEFAULT NULL,
  _attachment_url TEXT DEFAULT NULL,
  _attachment_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket_id UUID;
BEGIN
  -- Verify the organization has an active portal
  IF NOT EXISTS (
    SELECT 1 FROM helpdesk_settings 
    WHERE organization_id = _organization_id AND portal_enabled = true
  ) THEN
    RAISE EXCEPTION 'Portal not enabled for this organization';
  END IF;
  
  INSERT INTO helpdesk_tickets (
    organization_id,
    subject,
    contact_name,
    contact_email,
    contact_phone,
    details,
    attachment_url,
    attachment_name,
    channel
  ) VALUES (
    _organization_id,
    _subject,
    _contact_name,
    _contact_email,
    _contact_phone,
    _details,
    _attachment_url,
    _attachment_name,
    'web'
  )
  RETURNING id INTO _ticket_id;
  
  RETURN _ticket_id;
END;
$$;

-- Create storage bucket for helpdesk attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('helpdesk-attachments', 'helpdesk-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for helpdesk attachments (public upload for portal users)
CREATE POLICY "Anyone can upload helpdesk attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'helpdesk-attachments');

CREATE POLICY "Anyone can view helpdesk attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'helpdesk-attachments');

CREATE POLICY "Org members can delete helpdesk attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'helpdesk-attachments' AND auth.uid() IS NOT NULL);