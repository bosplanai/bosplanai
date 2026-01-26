-- Create table for response templates
CREATE TABLE public.helpdesk_response_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for ticket responses
CREATE TABLE public.helpdesk_ticket_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for response attachments
CREATE TABLE public.helpdesk_response_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.helpdesk_ticket_responses(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.helpdesk_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_response_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Users can view templates in their organization"
ON public.helpdesk_response_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_templates.organization_id
  )
);

CREATE POLICY "Users can create templates in their organization"
ON public.helpdesk_response_templates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_templates.organization_id
  )
);

CREATE POLICY "Users can update templates in their organization"
ON public.helpdesk_response_templates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_templates.organization_id
  )
);

CREATE POLICY "Users can delete templates in their organization"
ON public.helpdesk_response_templates FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_templates.organization_id
  )
);

-- RLS policies for ticket responses
CREATE POLICY "Users can view responses in their organization"
ON public.helpdesk_ticket_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_ticket_responses.organization_id
  )
);

CREATE POLICY "Users can create responses in their organization"
ON public.helpdesk_ticket_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_ticket_responses.organization_id
  )
);

-- RLS policies for response attachments
CREATE POLICY "Users can view response attachments in their organization"
ON public.helpdesk_response_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_attachments.organization_id
  )
);

CREATE POLICY "Users can create response attachments in their organization"
ON public.helpdesk_response_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_attachments.organization_id
  )
);

CREATE POLICY "Users can delete response attachments in their organization"
ON public.helpdesk_response_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.organization_id = helpdesk_response_attachments.organization_id
  )
);

-- Create storage bucket for response attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('helpdesk-response-attachments', 'helpdesk-response-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload response attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'helpdesk-response-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view response attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'helpdesk-response-attachments');

CREATE POLICY "Users can delete their response attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'helpdesk-response-attachments'
  AND auth.uid() IS NOT NULL
);