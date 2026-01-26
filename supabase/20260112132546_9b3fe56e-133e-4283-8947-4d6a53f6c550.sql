-- Create CRM Cases table
CREATE TABLE public.crm_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  type TEXT DEFAULT NULL,
  case_origin TEXT DEFAULT NULL,
  product_name TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  reported_by TEXT DEFAULT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.crm_cases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view cases in their organization"
  ON public.crm_cases
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create cases in their organization"
  ON public.crm_cases
  FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update cases in their organization"
  ON public.crm_cases
  FOR UPDATE
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete cases in their organization"
  ON public.crm_cases
  FOR DELETE
  USING (is_org_member(auth.uid(), organization_id));

-- Create function to generate case number
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TEXT
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

-- Create trigger to auto-generate case number
CREATE OR REPLACE FUNCTION public.set_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := generate_case_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_case_number_trigger
  BEFORE INSERT ON public.crm_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_case_number();

-- Create trigger for updating updated_at
CREATE TRIGGER update_crm_cases_updated_at
  BEFORE UPDATE ON public.crm_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();