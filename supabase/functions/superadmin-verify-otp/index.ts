import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configuration - stricter for OTP verification to prevent brute force
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 attempts
const RATE_LIMIT_WINDOW_MINUTES = 5; // Per 5 minutes (stricter window for verification)

// Get client IP from request headers
function getClientIP(req: Request): string {
  // Check common headers for real IP (in order of priority)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback to a default if no IP found
  return "unknown";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create admin client
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(req);
    const endpoint = "superadmin-verify-otp";
    
    console.log(`Rate limit check for IP: ${clientIP}, endpoint: ${endpoint}`);
    
    // Check rate limit using database function
    const { data: isAllowed, error: rateLimitError } = await adminClient
      .rpc("check_rate_limit", {
        p_ip_address: clientIP,
        p_endpoint: endpoint,
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
      });
    
    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Don't block on rate limit errors, just log and continue
    } else if (!isAllowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}, endpoint: ${endpoint}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many verification attempts. Please try again later.",
          retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * 60)
          } 
        }
      );
    }

    const { user_id, otp_code } = await req.json();

    if (!user_id || !otp_code) {
      console.error("Missing required fields: user_id or otp_code");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find valid OTP
    const { data: otpData, error: otpError } = await adminClient
      .from("super_admin_otp")
      .select("*")
      .eq("user_id", user_id)
      .eq("otp_code", otp_code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (otpError) {
      console.error("Error fetching OTP:", otpError);
      return new Response(
        JSON.stringify({ error: "Verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpData) {
      console.log(`Invalid or expired OTP for user ${user_id}`);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await adminClient
      .from("super_admin_otp")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpData.id);

    if (updateError) {
      console.error("Error marking OTP as used:", updateError);
    }

    // Clean up old OTPs for this user
    await adminClient
      .from("super_admin_otp")
      .delete()
      .eq("user_id", user_id)
      .neq("id", otpData.id);

    console.log(`OTP verified successfully for user ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification successful" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in superadmin-verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});