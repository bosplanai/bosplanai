-- Update notifications INSERT policy to allow admins and moderators to create notifications for org members
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;

CREATE POLICY "Users can insert notifications in their org"
ON public.notifications
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id)
  AND (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = notifications.organization_id
        AND ur.role IN ('admin', 'moderator')
    )
  )
);