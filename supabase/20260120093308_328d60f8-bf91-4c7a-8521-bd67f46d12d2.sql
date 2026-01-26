-- Create a table to track feature/page usage across the platform
CREATE TABLE public.feature_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  feature_name TEXT NOT NULL,
  feature_category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index for efficient querying by feature and time
CREATE INDEX idx_feature_usage_feature_name ON public.feature_usage_logs(feature_name);
CREATE INDEX idx_feature_usage_created_at ON public.feature_usage_logs(created_at);
CREATE INDEX idx_feature_usage_organization_id ON public.feature_usage_logs(organization_id);

-- Enable RLS
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all feature usage logs (using the is_super_admin function)
CREATE POLICY "Super admins can view all feature usage logs"
ON public.feature_usage_logs
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Any authenticated user can insert their own feature usage (for tracking)
CREATE POLICY "Users can insert their own feature usage"
ON public.feature_usage_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create a view for aggregated feature usage statistics
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