-- Add policy for super admins to delete feature usage logs (for managing feedback)
CREATE POLICY "Super admins can delete feature logs"
ON public.feature_usage_logs
FOR DELETE
USING (is_super_admin(auth.uid()));