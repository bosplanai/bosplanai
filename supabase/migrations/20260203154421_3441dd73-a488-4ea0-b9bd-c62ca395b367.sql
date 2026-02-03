-- Create super admin audit logs table
CREATE TABLE public.super_admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.super_admin_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.super_admin_audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.super_admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.super_admin_audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- APPEND-ONLY POLICIES: Only INSERT allowed, no UPDATE or DELETE

-- Service role can insert audit logs (edge functions use service role)
CREATE POLICY "Service role can insert audit logs"
ON public.super_admin_audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Super admins can view audit logs (read-only)
CREATE POLICY "Super admins can view audit logs"
ON public.super_admin_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- NO UPDATE POLICY - logs cannot be modified
-- NO DELETE POLICY - logs cannot be deleted

-- Create a function to prevent any updates (extra safety layer)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
  RETURN NULL;
END;
$$;

-- Create triggers to prevent updates and deletes at the database level
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON public.super_admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON public.super_admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();