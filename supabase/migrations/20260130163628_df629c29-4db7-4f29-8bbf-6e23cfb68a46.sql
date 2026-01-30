-- Drop the existing function
DROP FUNCTION IF EXISTS get_pending_invites_by_email(text);

-- Recreate with batch filtering - only return invites created within 5 minutes of each other
-- This ensures only invites from the same "session" are shown together
CREATE OR REPLACE FUNCTION get_pending_invites_by_email(_email text)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  organization_id uuid,
  token text,
  expires_at timestamptz,
  status text,
  org_name text,
  org_slug text,
  invited_by_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reference_time timestamptz;
BEGIN
  -- Get the most recent pending invite's created_at as reference
  SELECT oi.created_at INTO _reference_time
  FROM organization_invites oi
  WHERE LOWER(oi.email) = LOWER(_email)
    AND oi.status = 'pending'
    AND oi.expires_at > now()
  ORDER BY oi.created_at DESC
  LIMIT 1;

  -- Return only invites created within 5 minutes of the most recent one
  -- This groups invites by "batch" so stale invites from previous sessions aren't included
  RETURN QUERY
  SELECT 
    oi.id,
    oi.email,
    oi.role,
    oi.organization_id,
    oi.token,
    oi.expires_at,
    oi.status,
    o.name as org_name,
    o.slug as org_slug,
    p.full_name as invited_by_name,
    oi.created_at
  FROM organization_invites oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE LOWER(oi.email) = LOWER(_email)
    AND oi.status = 'pending'
    AND oi.expires_at > now()
    AND oi.created_at >= (_reference_time - interval '5 minutes')
  ORDER BY oi.created_at DESC;
END;
$$;