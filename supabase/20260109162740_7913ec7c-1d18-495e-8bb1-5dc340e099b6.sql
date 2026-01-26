
-- Create invoice settings table to store organization-level invoicing configuration
CREATE TABLE public.invoice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Organisation Profile
  business_name TEXT,
  business_address TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_website TEXT,
  tax_number TEXT,
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1B9AAA',
  secondary_color TEXT DEFAULT '#E0523A',
  
  -- General Settings
  currency TEXT DEFAULT 'GBP',
  location TEXT DEFAULT 'GB',
  tax_rate NUMERIC DEFAULT 20,
  tax_label TEXT DEFAULT 'VAT',
  financial_year_start TEXT DEFAULT 'april',
  
  -- Customisation
  invoice_prefix TEXT DEFAULT 'INV-',
  show_logo BOOLEAN DEFAULT true,
  show_tax_number BOOLEAN DEFAULT true,
  show_payment_terms BOOLEAN DEFAULT true,
  default_payment_terms TEXT DEFAULT '30',
  terms_and_conditions_url TEXT,
  footer_note TEXT,
  
  -- Reminders
  enable_reminders BOOLEAN DEFAULT true,
  reminder_before_due INTEGER DEFAULT 3,
  reminder_on_due BOOLEAN DEFAULT true,
  reminder_after_due INTEGER DEFAULT 7,
  max_reminders INTEGER DEFAULT 3
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invoice settings in their organization"
ON public.invoice_settings
FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can insert invoice settings"
ON public.invoice_settings
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can update invoice settings"
ON public.invoice_settings
FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_settings_updated_at
BEFORE UPDATE ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for invoice logos
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-logos', 'invoice-logos', true);

-- Storage policies for invoice logos
CREATE POLICY "Anyone can view invoice logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoice-logos');

CREATE POLICY "Org members can upload invoice logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'invoice-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org members can update invoice logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'invoice-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org members can delete invoice logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'invoice-logos' AND auth.uid() IS NOT NULL);
