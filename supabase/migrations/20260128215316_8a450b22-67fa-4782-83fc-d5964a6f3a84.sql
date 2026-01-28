-- =============================================
-- 1. Create guest_auth_attempts table for rate limiting
-- =============================================
CREATE TABLE IF NOT EXISTS public.guest_auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient lookups by email and time
CREATE INDEX IF NOT EXISTS idx_guest_auth_attempts_email_time 
ON public.guest_auth_attempts(email, created_at DESC);

-- No RLS needed - this table is only accessed by edge functions with service role
-- Clean up old records automatically (records older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_guest_auth_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.guest_auth_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- =============================================
-- 2. Fix AI usage functions - add authorization checks
-- =============================================
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
  -- Authorization check: verify caller belongs to organization or is super admin
  IF auth.uid() IS NOT NULL AND NOT (is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to track usage for this organization' USING ERRCODE = '42501';
  END IF;

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
  -- Authorization check: verify caller belongs to organization or is super admin
  IF auth.uid() IS NOT NULL AND NOT (is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to check usage for this organization' USING ERRCODE = '42501';
  END IF;

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

-- Revoke public access and grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_ai_usage_allowed(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_usage_allowed(UUID) TO authenticated;