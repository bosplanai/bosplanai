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

-- Create virtual_assistants table for super admins to manage VA accounts
CREATE TABLE public.virtual_assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  job_role TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create feature_usage_logs table for tracking activity
CREATE TABLE public.feature_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_category TEXT NOT NULL DEFAULT 'General',
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_feature_usage_logs_org ON public.feature_usage_logs(organization_id);
CREATE INDEX idx_feature_usage_logs_created ON public.feature_usage_logs(created_at);
CREATE INDEX idx_feature_usage_logs_feature ON public.feature_usage_logs(feature_name);

-- Create view for aggregated feature usage stats
CREATE OR REPLACE VIEW public.feature_usage_stats AS
SELECT 
  feature_name,
  feature_category,
  COUNT(*) as total_visits,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT organization_id) as unique_organizations,
  MAX(created_at) as last_used_at,
  MIN(created_at) as first_used_at,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as visits_last_24h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as visits_last_7d,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') as visits_last_30d
FROM public.feature_usage_logs
GROUP BY feature_name, feature_category;

-- Enable RLS on all tables
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;

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
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

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

CREATE POLICY "System can insert AI usage tracking"
ON public.ai_usage_tracking
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "System can update AI usage tracking"
ON public.ai_usage_tracking
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- RLS policies for virtual_assistants
CREATE POLICY "Super admins can view all virtual assistants"
ON public.virtual_assistants
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create virtual assistants"
ON public.virtual_assistants
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update virtual assistants"
ON public.virtual_assistants
FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete virtual assistants"
ON public.virtual_assistants
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- RLS policies for feature_usage_logs
CREATE POLICY "Users can insert their own feature logs"
ON public.feature_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all feature logs"
ON public.feature_usage_logs
FOR SELECT
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

-- Add is_suspended and suspension fields to organizations if not exists
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Add RLS policies for super admins to manage organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all organizations"
ON public.organizations
FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admin can view all profiles for user management
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_ai_usage_limits_updated_at
BEFORE UPDATE ON public.ai_usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_usage_tracking_updated_at
BEFORE UPDATE ON public.ai_usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_virtual_assistants_updated_at
BEFORE UPDATE ON public.virtual_assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();