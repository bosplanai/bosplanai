-- Fix the feature_usage_stats view to use security invoker
DROP VIEW IF EXISTS public.feature_usage_stats;

CREATE VIEW public.feature_usage_stats
WITH (security_invoker = on)
AS
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