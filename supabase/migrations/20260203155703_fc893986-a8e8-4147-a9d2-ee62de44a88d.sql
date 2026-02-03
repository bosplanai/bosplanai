-- Create a function that returns detailed rate limit info
CREATE OR REPLACE FUNCTION public.get_rate_limit_info(
  p_ip_address TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  limit_count INTEGER,
  remaining_count INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
  v_record_id UUID;
  v_window_start_time TIMESTAMP WITH TIME ZONE;
  v_reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Clean up old entries for this IP/endpoint
  DELETE FROM rate_limits 
  WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint 
    AND window_start < v_window_start;
  
  -- Get current count within window
  SELECT id, request_count, window_start INTO v_record_id, v_current_count, v_window_start_time
  FROM rate_limits
  WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint 
    AND window_start >= v_window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF v_record_id IS NULL THEN
    -- No existing record, create new one
    INSERT INTO rate_limits (ip_address, endpoint, request_count, window_start)
    VALUES (p_ip_address, p_endpoint, 1, now())
    RETURNING window_start INTO v_window_start_time;
    
    v_current_count := 1;
  ELSIF v_current_count >= p_max_requests THEN
    -- Rate limit exceeded, don't increment
    NULL;
  ELSE
    -- Increment counter
    UPDATE rate_limits 
    SET request_count = request_count + 1 
    WHERE id = v_record_id;
    
    v_current_count := v_current_count + 1;
  END IF;
  
  -- Calculate reset time
  v_reset_time := v_window_start_time + (p_window_minutes || ' minutes')::interval;
  
  RETURN QUERY SELECT 
    v_current_count < p_max_requests OR v_record_id IS NULL,
    p_max_requests,
    GREATEST(0, p_max_requests - v_current_count),
    v_reset_time,
    GREATEST(0, EXTRACT(EPOCH FROM (v_reset_time - now()))::INTEGER);
END;
$$;