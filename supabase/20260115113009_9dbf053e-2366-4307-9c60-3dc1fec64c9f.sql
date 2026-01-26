-- Create table for AI usage limits (platform-wide settings)
CREATE TABLE public.ai_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('daily', 'monthly', 'yearly')),
  max_prompts INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(limit_type)
);

-- Create table for tracking AI usage per organization
CREATE TABLE public.ai_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_count INTEGER NOT NULL DEFAULT 0,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly', 'yearly')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, period_type, period_start)
);

-- Enable RLS
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_usage_limits (all authenticated users can view, only super admins can manage)
CREATE POLICY "Authenticated users can view AI usage limits"
ON public.ai_usage_limits
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can insert AI usage limits"
ON public.ai_usage_limits
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update AI usage limits"
ON public.ai_usage_limits
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete AI usage limits"
ON public.ai_usage_limits
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS policies for ai_usage_tracking
CREATE POLICY "Users can view their organization AI usage"
ON public.ai_usage_tracking
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can insert AI usage tracking"
ON public.ai_usage_tracking
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update AI usage tracking"
ON public.ai_usage_tracking
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete AI usage tracking"
ON public.ai_usage_tracking
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Insert default limits (disabled by default)
INSERT INTO public.ai_usage_limits (limit_type, max_prompts, is_enabled)
VALUES 
  ('daily', 10, false),
  ('monthly', 300, false),
  ('yearly', 3600, false);

-- Create function to increment AI usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_limit INTEGER;
  monthly_limit INTEGER;
  yearly_limit INTEGER;
  daily_enabled BOOLEAN;
  monthly_enabled BOOLEAN;
  yearly_enabled BOOLEAN;
  current_daily INTEGER;
  current_monthly INTEGER;
  current_yearly INTEGER;
  today_start TIMESTAMP WITH TIME ZONE;
  month_start TIMESTAMP WITH TIME ZONE;
  year_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current period starts
  today_start := date_trunc('day', now());
  month_start := date_trunc('month', now());
  year_start := date_trunc('year', now());

  -- Get limits
  SELECT max_prompts, is_enabled INTO daily_limit, daily_enabled
  FROM ai_usage_limits WHERE limit_type = 'daily';
  
  SELECT max_prompts, is_enabled INTO monthly_limit, monthly_enabled
  FROM ai_usage_limits WHERE limit_type = 'monthly';
  
  SELECT max_prompts, is_enabled INTO yearly_limit, yearly_enabled
  FROM ai_usage_limits WHERE limit_type = 'yearly';

  -- Get current usage counts
  SELECT COALESCE(prompt_count, 0) INTO current_daily
  FROM ai_usage_tracking
  WHERE organization_id = org_id AND period_type = 'daily' AND period_start = today_start;
  
  SELECT COALESCE(prompt_count, 0) INTO current_monthly
  FROM ai_usage_tracking
  WHERE organization_id = org_id AND period_type = 'monthly' AND period_start = month_start;
  
  SELECT COALESCE(prompt_count, 0) INTO current_yearly
  FROM ai_usage_tracking
  WHERE organization_id = org_id AND period_type = 'yearly' AND period_start = year_start;

  -- Check limits
  IF daily_enabled AND current_daily >= daily_limit THEN
    RETURN FALSE;
  END IF;
  
  IF monthly_enabled AND current_monthly >= monthly_limit THEN
    RETURN FALSE;
  END IF;
  
  IF yearly_enabled AND current_yearly >= yearly_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment daily usage
  INSERT INTO ai_usage_tracking (organization_id, prompt_count, period_type, period_start, period_end)
  VALUES (org_id, 1, 'daily', today_start, today_start + INTERVAL '1 day')
  ON CONFLICT (organization_id, period_type, period_start)
  DO UPDATE SET prompt_count = ai_usage_tracking.prompt_count + 1, updated_at = now();

  -- Increment monthly usage
  INSERT INTO ai_usage_tracking (organization_id, prompt_count, period_type, period_start, period_end)
  VALUES (org_id, 1, 'monthly', month_start, month_start + INTERVAL '1 month')
  ON CONFLICT (organization_id, period_type, period_start)
  DO UPDATE SET prompt_count = ai_usage_tracking.prompt_count + 1, updated_at = now();

  -- Increment yearly usage
  INSERT INTO ai_usage_tracking (organization_id, prompt_count, period_type, period_start, period_end)
  VALUES (org_id, 1, 'yearly', year_start, year_start + INTERVAL '1 year')
  ON CONFLICT (organization_id, period_type, period_start)
  DO UPDATE SET prompt_count = ai_usage_tracking.prompt_count + 1, updated_at = now();

  RETURN TRUE;
END;
$$;

-- Create function to check if usage is allowed
CREATE OR REPLACE FUNCTION public.check_ai_usage_allowed(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_limit INTEGER;
  monthly_limit INTEGER;
  yearly_limit INTEGER;
  daily_enabled BOOLEAN;
  monthly_enabled BOOLEAN;
  yearly_enabled BOOLEAN;
  current_daily INTEGER;
  current_monthly INTEGER;
  current_yearly INTEGER;
  today_start TIMESTAMP WITH TIME ZONE;
  month_start TIMESTAMP WITH TIME ZONE;
  year_start TIMESTAMP WITH TIME ZONE;
BEGIN
  today_start := date_trunc('day', now());
  month_start := date_trunc('month', now());
  year_start := date_trunc('year', now());

  SELECT max_prompts, is_enabled INTO daily_limit, daily_enabled
  FROM ai_usage_limits WHERE limit_type = 'daily';
  
  SELECT max_prompts, is_enabled INTO monthly_limit, monthly_enabled
  FROM ai_usage_limits WHERE limit_type = 'monthly';
  
  SELECT max_prompts, is_enabled INTO yearly_limit, yearly_enabled
  FROM ai_usage_limits WHERE limit_type = 'yearly';

  SELECT COALESCE(prompt_count, 0) INTO current_daily
  FROM ai_usage_tracking
  WHERE organization_id = org_id AND period_type = 'daily' AND period_start = today_start;
  
  SELECT COALESCE(prompt_count, 0) INTO current_monthly
  FROM ai_usage_tracking
  WHERE organization_id = org_id AND period_type = 'monthly' AND period_start = month_start;
  
  SELECT COALESCE(prompt_count, 0) INTO current_yearly
  FROM ai_usage_tracking
  WHERE organization_id = org_id AND period_type = 'yearly' AND period_start = year_start;

  IF daily_enabled AND current_daily >= daily_limit THEN
    RETURN FALSE;
  END IF;
  
  IF monthly_enabled AND current_monthly >= monthly_limit THEN
    RETURN FALSE;
  END IF;
  
  IF yearly_enabled AND current_yearly >= yearly_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_ai_usage_limits_updated_at
BEFORE UPDATE ON public.ai_usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_usage_tracking_updated_at
BEFORE UPDATE ON public.ai_usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();