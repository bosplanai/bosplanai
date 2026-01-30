-- Create team_working_hours table for TaskFlow
CREATE TABLE public.team_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  monday_hours NUMERIC NOT NULL DEFAULT 8,
  tuesday_hours NUMERIC NOT NULL DEFAULT 8,
  wednesday_hours NUMERIC NOT NULL DEFAULT 8,
  thursday_hours NUMERIC NOT NULL DEFAULT 8,
  friday_hours NUMERIC NOT NULL DEFAULT 8,
  saturday_hours NUMERIC NOT NULL DEFAULT 0,
  sunday_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable Row Level Security
ALTER TABLE public.team_working_hours ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view working hours in their organization" 
ON public.team_working_hours 
FOR SELECT 
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert working hours" 
ON public.team_working_hours 
FOR INSERT 
WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update working hours" 
ON public.team_working_hours 
FOR UPDATE 
USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete working hours" 
ON public.team_working_hours 
FOR DELETE 
USING (is_org_admin(auth.uid(), organization_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_working_hours_updated_at
BEFORE UPDATE ON public.team_working_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();