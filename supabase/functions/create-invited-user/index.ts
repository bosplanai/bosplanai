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
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("organization_invites")
      .select("id, email, status")
      .eq("id", inviteToken)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      console.error("Invalid or expired invite token:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the email matches the invitation
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Email does not match invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          error: "User already exists", 
          code: "USER_EXISTS",
          userId: existingUser.id 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.error("Failed to create user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
