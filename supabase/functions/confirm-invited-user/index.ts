import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, inviteToken, fullName, jobRole, phoneNumber } = await req.json();

    if (!email || !password || !inviteToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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
      .select("id, email, role, organization_id, status, expires_at")
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

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Email does not match invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization info
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("slug, name")
      .eq("id", invite.organization_id)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user using admin API - this bypasses email confirmation
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email for invited users
    });

    if (createError) {
      // Check if user already exists
      if (createError.message?.includes("already been registered") || createError.code === "email_exists") {
        console.log("User already exists, attempting to sign in");
        return new Response(
          JSON.stringify({ 
            error: "Account already exists", 
            code: "USER_EXISTS",
            message: "Please sign in with your existing password"
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Failed to create user:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log("Created user:", userId);

    // Map invite role to app_role enum
    // Invite uses: admin, member, viewer
    // Enum has: admin, moderator, user, super_admin
    let appRole: string;
    switch (invite.role) {
      case 'admin':
        appRole = 'admin';
        break;
      case 'member':
        appRole = 'moderator';
        break;
      case 'viewer':
      default:
        appRole = 'user';
        break;
    }

    // Create profile (invited users have onboarding_completed = true)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        organization_id: invite.organization_id,
        full_name: fullName,
        job_role: jobRole,
        phone_number: phoneNumber,
        onboarding_completed: true, // Invited users skip onboarding
      });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created profile for user:", userId);

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        organization_id: invite.organization_id,
        role: appRole,
      });

    if (roleError) {
      console.error("Failed to create user role:", roleError);
      // Clean up
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to assign user role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created role for user:", userId, "role:", appRole);

    // Mark invite as accepted
    const { error: updateError } = await supabaseAdmin
      .from("organization_invites")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Failed to update invite status:", updateError);
      // Non-critical error, continue
    }

    console.log("Successfully completed invitation acceptance for user:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        organizationSlug: org.slug,
        organizationName: org.name,
        role: invite.role
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in confirm-invited-user:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
