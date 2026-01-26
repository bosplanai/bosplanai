-- Create meetings table for CRM
CREATE TABLE public.crm_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_venue TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view meetings in their organization"
  ON public.crm_meetings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create meetings in their organization"
  ON public.crm_meetings FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update meetings in their organization"
  ON public.crm_meetings FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete meetings in their organization"
  ON public.crm_meetings FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Create function to generate meeting number
CREATE OR REPLACE FUNCTION public.generate_meeting_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(meeting_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.crm_meetings;
  RETURN 'MTG' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate meeting number
CREATE OR REPLACE FUNCTION public.set_meeting_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.meeting_number IS NULL OR NEW.meeting_number = '' THEN
    NEW.meeting_number := public.generate_meeting_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_meeting_number
  BEFORE INSERT ON public.crm_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_meeting_number();

-- Create trigger to update updated_at
CREATE TRIGGER update_crm_meetings_updated_at
  BEFORE UPDATE ON public.crm_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();