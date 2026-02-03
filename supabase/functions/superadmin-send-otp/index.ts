import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configuration
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests
const RATE_LIMIT_WINDOW_MINUTES = 1; // Per 1 minute

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

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create admin client for rate limiting check
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(req);
    const endpoint = "superadmin-send-otp";
    
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
          error: "Too many requests. Please try again later.",
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

    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      console.error("Missing required fields: user_id or email");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing OTPs for this user
    await adminClient
      .from("super_admin_otp")
      .delete()
      .eq("user_id", user_id);

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via email
    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: resendFromEmail.includes("<") ? resendFromEmail : `BosPlan Security <${resendFromEmail}>`,
      to: [email],
      subject: "Your Super Admin Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🔐 Super Admin Verification</h1>
          </div>
          <div style="background: #1e293b; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #94a3b8; font-size: 16px; margin-bottom: 20px;">
              A login attempt was made to the BosPlan Super Admin dashboard. 
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
      // Delete the OTP since we couldn't send the email
      await adminClient
        .from("super_admin_otp")
        .delete()
        .eq("user_id", user_id);
      
      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`OTP email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in superadmin-send-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});