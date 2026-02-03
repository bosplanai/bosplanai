import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configuration - stricter for OTP verification
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 5;

// Get client IP from request headers
function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP.trim();
  return "unknown";
}

// Log audit event
async function logAuditEvent(
  adminClient: any,
  userId: string | null,
  userEmail: string,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details: object | null,
  ipAddress: string,
  userAgent: string | null
) {
  try {
    await adminClient.from("super_admin_audit_logs").insert({
      user_id: userId,
      user_email: userEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    console.log(`Audit log: ${action} by ${userEmail} from ${ipAddress}`);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const clientIP = getClientIP(req);
  const userAgent = req.headers.get("user-agent");
  const endpoint = "superadmin-verify-otp";

  try {
    console.log(`Rate limit check for IP: ${clientIP}, endpoint: ${endpoint}`);
    
    const { data: isAllowed, error: rateLimitError } = await adminClient
      .rpc("check_rate_limit", {
        p_ip_address: clientIP,
        p_endpoint: endpoint,
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
      });
    
    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (!isAllowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}, endpoint: ${endpoint}`);
      
      // Log rate limit hit
      await logAuditEvent(
        adminClient,
        null,
        "unknown",
        "rate_limit_exceeded",
        "auth",
        null,
        { endpoint, reason: "Too many verification attempts" },
        clientIP,
        userAgent
      );
      
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

    // Get user email for audit logging
    const { data: userData } = await adminClient.auth.admin.getUserById(user_id);
    const userEmail = userData?.user?.email || "unknown";

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
      
      // Log failed verification attempt
      await logAuditEvent(
        adminClient,
        user_id,
        userEmail,
        "otp_verification_failed",
        "auth",
        null,
        { reason: "Invalid or expired OTP" },
        clientIP,
        userAgent
      );
      
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

    // Log successful login
    await logAuditEvent(
      adminClient,
      user_id,
      userEmail,
      "superadmin_login_success",
      "auth",
      null,
      { method: "otp" },
      clientIP,
      userAgent
    );

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