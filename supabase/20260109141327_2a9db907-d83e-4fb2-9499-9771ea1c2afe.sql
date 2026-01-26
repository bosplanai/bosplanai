-- Create table for team working hours settings
CREATE TABLE public.team_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  monday_hours NUMERIC(4,2) DEFAULT 8,
  tuesday_hours NUMERIC(4,2) DEFAULT 8,
  wednesday_hours NUMERIC(4,2) DEFAULT 8,
  thursday_hours NUMERIC(4,2) DEFAULT 8,
  friday_hours NUMERIC(4,2) DEFAULT 8,
  saturday_hours NUMERIC(4,2) DEFAULT 0,
  sunday_hours NUMERIC(4,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_working_hours ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage working hours"
ON public.team_working_hours
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.organization_id = team_working_hours.organization_id
    AND user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Members can view working hours"
ON public.team_working_hours
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.organization_id = team_working_hours.organization_id
    AND user_roles.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_team_working_hours_updated_at
BEFORE UPDATE ON public.team_working_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();