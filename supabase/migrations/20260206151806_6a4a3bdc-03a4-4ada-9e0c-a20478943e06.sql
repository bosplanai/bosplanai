-- Update the enforce_task_update_permissions function to allow position updates
-- This enables drag-and-drop task movement for all account types
CREATE OR REPLACE FUNCTION public.enforce_task_update_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_keys text[] := array[
    'status',
    'completed_at',
    'position',
    'assignment_status',
    'assignment_responded_at',
    'decline_reason',
    'last_reminder_sent_at',
    'assigned_user_id',
    'reassignment_reason',
    'updated_at'
  ];
  old_filtered jsonb;
  new_filtered jsonb;
  k text;
  is_admin boolean;
  is_moderator boolean;
  is_user boolean;
BEGIN
  -- If there's no authenticated user context (e.g., service jobs), don't block.
  IF auth.uid() IS NULL THEN
    RETURN new;
  END IF;

  is_admin := is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = new.organization_id
        AND ur.role = 'admin'::public.app_role
    );

  IF is_admin THEN
    RETURN new;
  END IF;

  is_moderator := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = new.organization_id
      AND ur.role = 'moderator'::public.app_role
  );

  is_user := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = new.organization_id
      AND ur.role = 'user'::public.app_role
  );

  old_filtered := to_jsonb(old);
  new_filtered := to_jsonb(new);

  FOREACH k IN ARRAY allowed_keys LOOP
    old_filtered := old_filtered - k;
    new_filtered := new_filtered - k;
  END LOOP;

  IF is_user THEN
    IF new_filtered <> old_filtered THEN
      RAISE EXCEPTION 'Team accounts can only update task status/assignment fields.';
    END IF;
    RETURN new;
  END IF;

  IF is_moderator AND old.created_by_user_id IS DISTINCT FROM auth.uid() THEN
    IF new_filtered <> old_filtered THEN
      RAISE EXCEPTION 'Manager accounts can only update task status/assignment fields for tasks they did not create.';
    END IF;
    RETURN new;
  END IF;

  RETURN new;
END;
$function$;