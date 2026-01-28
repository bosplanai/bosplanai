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

    // Check if a VA record already exists with this email
    const { data: existingVA } = await serviceClient
      .from("virtual_assistants")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingVA) {
      return new Response(
        JSON.stringify({ error: "A virtual assistant with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for existing user by email using listUsers with filter
    let userId: string | null = null;
    let tempPassword: string | null = null;
    let isNewUser = false;

    // List users and find by email (since getUserByEmail may not be available in all versions)
    const { data: listUsersData } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    
    const existingAuthUser = listUsersData?.users?.find(u => u.email === email);
    
    if (existingAuthUser) {
      // User exists - use their existing account
      userId = existingAuthUser.id;
      console.log(`Found existing auth user for email ${email}: ${userId}`);
      
      // Update their metadata to mark as VA
      await serviceClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingAuthUser.user_metadata,
          is_virtual_assistant: true,
        },
      });
    } else {
      // Create new user
      isNewUser = true;
      tempPassword = generateTempPassword();
      
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
      
      userId = newUser.user.id;
      console.log(`Created new auth user for email ${email}: ${userId}`);
    }

    // Create the virtual assistant record
    const { data: vaRecord, error: vaError } = await serviceClient
      .from("virtual_assistants")
      .insert({
        user_id: userId,
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
      // Only clean up if we created a new user
      if (isNewUser && userId) {
        await serviceClient.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ error: vaError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If assigned to an organization, create a profile (if one doesn't already exist)
    if (organizationId && userId) {
      // Check if profile already exists
      const { data: existingProfile } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await serviceClient
          .from("profiles")
          .insert({
            id: userId,
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
      }

      // Check if user role already exists
      const { data: existingRole } = await serviceClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await serviceClient
          .from("user_roles")
          .insert({
            user_id: userId,
            organization_id: organizationId,
            role: "user",
          });

        if (roleError) {
          console.error("Error creating user role:", roleError);
        }
      }
    }

    console.log(`Virtual Assistant created: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        va: vaRecord,
        tempPassword: isNewUser ? tempPassword : null,
        existingUser: !isNewUser,
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
