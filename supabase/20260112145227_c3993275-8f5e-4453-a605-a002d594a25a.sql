-- Create CRM Activities table
CREATE TABLE public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_number VARCHAR(20) NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  type VARCHAR(50) NULL,
  due_date DATE NULL,
  customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_crm_activities_organization_id ON public.crm_activities(organization_id);
CREATE INDEX idx_crm_activities_customer_id ON public.crm_activities(customer_id);
CREATE INDEX idx_crm_activities_assigned_to ON public.crm_activities(assigned_to);
CREATE INDEX idx_crm_activities_due_date ON public.crm_activities(due_date);

-- Enable Row Level Security
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view activities in their organization"
ON public.crm_activities
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create activities in their organization"
ON public.crm_activities
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update activities in their organization"
ON public.crm_activities
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete activities in their organization"
ON public.crm_activities
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create function to generate activity number
CREATE OR REPLACE FUNCTION public.generate_activity_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.activity_number := 'ACT-' || LPAD(NEXTVAL('public.activity_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create sequence for activity numbers
CREATE SEQUENCE IF NOT EXISTS public.activity_number_seq START WITH 1;

-- Create trigger to auto-generate activity number
CREATE TRIGGER set_activity_number
BEFORE INSERT ON public.crm_activities
FOR EACH ROW
EXECUTE FUNCTION public.generate_activity_number();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crm_activities_updated_at
BEFORE UPDATE ON public.crm_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();