
-- Create a table to log broadcast history
CREATE TABLE public.customer_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  sent_by UUID NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_broadcasts ENABLE ROW LEVEL SECURITY;

-- Only super admins can view/insert broadcasts
CREATE POLICY "Super admins can view broadcasts"
  ON public.customer_broadcasts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert broadcasts"
  ON public.customer_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Function to send broadcast notification to all users
CREATE OR REPLACE FUNCTION public.send_customer_broadcast(broadcast_message TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_id UUID;
  user_record RECORD;
  user_count INTEGER := 0;
  broadcast_id UUID;
  full_message TEXT;
BEGIN
  sender_id := auth.uid();
  
  -- Verify sender is super admin
  IF NOT public.has_role(sender_id, 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  full_message := 'An update from your Bosplan admins: ' || broadcast_message;

  -- Insert notification for every user who has an organization membership
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type)
  SELECT DISTINCT ur.user_id, ur.organization_id, 'platform_broadcast', 'Platform Update', full_message, 'broadcast'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'moderator', 'user');

  GET DIAGNOSTICS user_count = ROW_COUNT;

  -- Log the broadcast
  INSERT INTO public.customer_broadcasts (message, sent_by, recipient_count)
  VALUES (broadcast_message, sender_id, user_count)
  RETURNING id INTO broadcast_id;

  RETURN json_build_object('success', true, 'recipient_count', user_count, 'broadcast_id', broadcast_id);
END;
$$;
