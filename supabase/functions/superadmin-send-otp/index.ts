import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configuration
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 1;

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

// Build rate limit headers
function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: string,
  retryAfterSeconds: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": resetAt,
    "Retry-After": String(retryAfterSeconds),
  };
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

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  const endpoint = "superadmin-send-otp";

  // Default rate limit headers (will be updated after rate limit check)
  let rateLimitHeaders: Record<string, string> = {};

  try {
    console.log(`Rate limit check for IP: ${clientIP}, endpoint: ${endpoint}`);
    
    // Use the new function that returns detailed rate limit info
    const { data: rateLimitInfo, error: rateLimitError } = await adminClient
      .rpc("get_rate_limit_info", {
        p_ip_address: clientIP,
        p_endpoint: endpoint,
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
      });
    
    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (rateLimitInfo && rateLimitInfo.length > 0) {
      const info = rateLimitInfo[0];
      
      // Build rate limit headers for all responses
      rateLimitHeaders = buildRateLimitHeaders(
        info.limit_count,
        info.remaining_count,
        info.reset_at,
        info.retry_after_seconds
      );
      
      if (!info.is_allowed) {
        console.warn(`Rate limit exceeded for IP: ${clientIP}, endpoint: ${endpoint}`);
        
        // Log rate limit hit
        await logAuditEvent(
          adminClient,
          null,
          "unknown",
          "rate_limit_exceeded",
          "auth",
          null,
          { endpoint, reason: "Too many OTP requests" },
          clientIP,
          userAgent
        );
        
        return new Response(
          JSON.stringify({ 
            error: "Too many requests. Please try again later.",
            retryAfter: info.retry_after_seconds
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              ...rateLimitHeaders,
              "Content-Type": "application/json"
            } 
          }
        );
      }
    }

    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      console.error("Missing required fields: user_id or email");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is a super admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User is not a super admin:", user_id);
      
      // Log unauthorized access attempt
      await logAuditEvent(
        adminClient,
        user_id,
        email,
        "unauthorized_access_attempt",
        "auth",
        null,
        { reason: "User is not a super admin" },
        clientIP,
        userAgent
      );
      
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing OTPs for this user
    await adminClient
      .from("super_admin_otp")
      .delete()
      .eq("user_id", user_id);

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`Generated OTP for user ${user_id}, expires at ${expiresAt.toISOString()}`);

    // Store OTP in database
    const { error: insertError } = await adminClient
      .from("super_admin_otp")
      .insert({
        user_id,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via email
    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: resendFromEmail.includes("<") ? resendFromEmail : `Bosplan Security <${resendFromEmail}>`,
      to: [email],
      subject: "Your Super Admin Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🔐 Super Admin Verification</h1>
          </div>
          <div style="background: #1e293b; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #94a3b8; font-size: 16px; margin-bottom: 20px;">
              A login attempt was made to the Bosplan Super Admin dashboard.
              Use the verification code below to complete your login:
            </p>
            <div style="background: #0f172a; border: 2px solid #f97316; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 8px; font-family: monospace;">
                ${otpCode}
              </span>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              This code will expire in <strong style="color: #f97316;">10 minutes</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;">
            <p style="color: #475569; font-size: 12px; text-align: center;">
              If you did not attempt to log in, please ignore this email and ensure your account is secure.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Failed to send OTP email:", emailError);
      await adminClient.from("super_admin_otp").delete().eq("user_id", user_id);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful OTP send
    await logAuditEvent(
      adminClient,
      user_id,
      email,
      "otp_requested",
      "auth",
      null,
      { success: true },
      clientIP,
      userAgent
    );

    console.log(`OTP email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in superadmin-send-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
    );
  }
});
