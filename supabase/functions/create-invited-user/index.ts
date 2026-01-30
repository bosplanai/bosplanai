import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, inviteToken } = await req.json();

    if (!email || !password || !inviteToken) {
      return new Response(
        JSON.stringify({ error: "Missing email, password, or inviteToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the invite token is valid and pending
    // Check against both 'token' column (new) and 'id' column (legacy) for compatibility
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("organization_invites")
      .select("id, email, status, token, expires_at")
      .or(`token.eq.${inviteToken},id.eq.${inviteToken}`)
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString())
      .single();

    // IMPORTANT: For expected/handled states, return 200 with a structured body.
    // This avoids Supabase `functions.invoke` treating non-2xx as a transport error,
    // which is brittle to parse on the frontend.
    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "INVITE_INVALID",
          error: "This invitation is invalid, has expired, or has already been used.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the email matches the invitation
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          code: "EMAIL_MISMATCH",
          error: "Email does not match invitation",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with Admin API - this bypasses email confirmation entirely
    // Setting email_confirm: true means no confirmation email will be sent
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Pre-confirm the email - no confirmation email sent
    });

    if (createError) {
      const msg = (createError.message || "").toLowerCase();

      // Supabase returns an error when the email is already registered.
      // We don't need the user id here; the frontend will route them to login.
      if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists"))) {
        return new Response(
          JSON.stringify({
            success: false,
            code: "USER_EXISTS",
            email,
            error: "User already exists",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("Failed to create user:", createError);
      // Return 200 so the frontend gets a consistent, parseable response.
      return new Response(
        JSON.stringify({ success: false, code: "CREATE_FAILED", error: createError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully created pre-confirmed user:", newUser.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        email: newUser.user.email
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-invited-user:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, code: "UNHANDLED", error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
