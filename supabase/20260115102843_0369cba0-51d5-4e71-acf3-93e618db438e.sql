-- Create a function to notify full access users about expired policies
CREATE OR REPLACE FUNCTION public.notify_expired_policies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Only trigger when policy becomes expired or was just created as expired
  IF (NEW.status = 'expired' OR (NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE)) 
     AND (OLD IS NULL OR OLD.status != 'expired') THEN
    
    -- Update status to expired if not already
    IF NEW.status != 'expired' AND NEW.expiry_date < CURRENT_DATE THEN
      NEW.status := 'expired';
    END IF;
    
    -- Create notifications for all admin users in the organization
    FOR user_record IN 
      SELECT ur.user_id 
      FROM user_roles ur 
      WHERE ur.organization_id = NEW.organization_id 
        AND ur.role = 'admin'
    LOOP
      -- Check if notification already exists for this policy and user
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = user_record.user_id 
          AND reference_id = NEW.id 
          AND reference_type = 'policy_expired'
      ) THEN
        INSERT INTO notifications (
          user_id,
          organization_id,
          type,
          title,
          message,
          reference_id,
          reference_type,
          is_read
        ) VALUES (
          user_record.user_id,
          NEW.organization_id,
          'policy_alert',
          'Policy Expired - Review Required',
          'The policy "' || NEW.title || '" has expired and needs to be reviewed.',
          NEW.id,
          'policy_expired',
          false
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for policy updates
DROP TRIGGER IF EXISTS trigger_notify_expired_policies ON policies;
CREATE TRIGGER trigger_notify_expired_policies
  BEFORE INSERT OR UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_expired_policies();

-- Create a function to check and notify about newly expired policies (can be called periodically)
CREATE OR REPLACE FUNCTION public.check_expired_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_record RECORD;
  user_record RECORD;
BEGIN
  -- Find policies that have expired but status hasn't been updated
  FOR policy_record IN 
    SELECT id, title, organization_id, expiry_date
    FROM policies 
    WHERE status = 'active' 
      AND expiry_date IS NOT NULL 
      AND expiry_date < CURRENT_DATE
  LOOP
    -- Update policy status to expired
    UPDATE policies SET status = 'expired' WHERE id = policy_record.id;
    
    -- Create notifications for admin users
    FOR user_record IN 
      SELECT ur.user_id 
      FROM user_roles ur 
      WHERE ur.organization_id = policy_record.organization_id 
        AND ur.role = 'admin'
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = user_record.user_id 
          AND reference_id = policy_record.id 
          AND reference_type = 'policy_expired'
      ) THEN
        INSERT INTO notifications (
          user_id,
          organization_id,
          type,
          title,
          message,
          reference_id,
          reference_type,
          is_read
        ) VALUES (
          user_record.user_id,
          policy_record.organization_id,
          'policy_alert',
          'Policy Expired - Review Required',
          'The policy "' || policy_record.title || '" has expired and needs to be reviewed.',
          policy_record.id,
          'policy_expired',
          false
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;