
-- Create agents waitlist table
CREATE TABLE public.agent_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public signup form)
CREATE POLICY "Anyone can sign up for waitlist"
  ON public.agent_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only super admins can view waitlist entries
CREATE POLICY "Super admins can view waitlist"
  ON public.agent_waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super admins can delete waitlist entries
CREATE POLICY "Super admins can delete waitlist"
  ON public.agent_waitlist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
