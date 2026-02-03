import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, otp_code } = await req.json();

    if (!user_id || !otp_code) {
      console.error("Missing required fields: user_id or otp_code");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

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
