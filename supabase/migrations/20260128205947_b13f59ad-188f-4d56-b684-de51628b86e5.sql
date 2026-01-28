-- Update notifications SELECT policy to restrict TaskFlow alerts to admins only
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (
  auth.uid() = user_id
  AND (
    -- Non-TaskFlow notifications: visible to all users
    type NOT IN (
      'task_request',
      'task_request_accepted', 
      'task_request_declined',
      'task_completed',
      'task_assigned',
      'task_reassigned'
    )
    -- TaskFlow notifications: only visible to admins
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.organization_id = notifications.organization_id
      AND ur.role = 'admin'
    )
  )
);