import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random temporary password
function generateTempPassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify super admin status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { 
      _user_id: userData.user.id 
    });

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { firstName, lastName, email, phoneNumber, jobRole, organizationId } = await req.json();

    if (!firstName || !lastName || !email || !jobRole) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create the user in auth
    const { data: newUser, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        is_virtual_assistant: true,
      },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the virtual assistant record
    const { data: vaRecord, error: vaError } = await serviceClient
      .from("virtual_assistants")
      .insert({
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber || null,
        job_role: jobRole,
        organization_id: organizationId || null,
        status: "active",
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (vaError) {
      console.error("Error creating VA record:", vaError);
      // Try to clean up the created user
      await serviceClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: vaError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If assigned to an organization, create a profile
    if (organizationId) {
      const { error: profileError } = await serviceClient
        .from("profiles")
        .insert({
          id: newUser.user.id,
          organization_id: organizationId,
          full_name: `${firstName} ${lastName}`,
          job_role: jobRole,
          phone_number: phoneNumber || "",
          is_virtual_assistant: true,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Non-fatal - VA is created but not linked to profile
      }

      // Add user role
      const { error: roleError } = await serviceClient
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          organization_id: organizationId,
          role: "user",
        });

      if (roleError) {
        console.error("Error creating user role:", roleError);
      }
    }

    console.log(`Virtual Assistant created: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        va: vaRecord,
        tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in create-virtual-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
