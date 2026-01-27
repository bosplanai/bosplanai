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

    const { vaId, firstName, lastName, phoneNumber, jobRole, organizationId } = await req.json();

    if (!vaId) {
      return new Response(
        JSON.stringify({ error: "Missing VA ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current VA record
    const { data: currentVA, error: fetchError } = await serviceClient
      .from("virtual_assistants")
      .select("*")
      .eq("id", vaId)
      .single();

    if (fetchError || !currentVA) {
      return new Response(
        JSON.stringify({ error: "Virtual Assistant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the VA record
    const updateData: Record<string, unknown> = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (phoneNumber !== undefined) updateData.phone_number = phoneNumber || null;
    if (jobRole) updateData.job_role = jobRole;
    if (organizationId !== undefined) updateData.organization_id = organizationId || null;

    const { data: updatedVA, error: updateError } = await serviceClient
      .from("virtual_assistants")
      .update(updateData)
      .eq("id", vaId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating VA:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If organization changed and VA has a user_id, update their profile
    if (currentVA.user_id && organizationId !== undefined && organizationId !== currentVA.organization_id) {
      if (organizationId) {
        // Check if profile exists
        const { data: existingProfile } = await serviceClient
          .from("profiles")
          .select("id")
          .eq("id", currentVA.user_id)
          .single();

        if (existingProfile) {
          // Update existing profile
          await serviceClient
            .from("profiles")
            .update({ organization_id: organizationId })
            .eq("id", currentVA.user_id);
        } else {
          // Create new profile
          await serviceClient
            .from("profiles")
            .insert({
              id: currentVA.user_id,
              organization_id: organizationId,
              full_name: `${firstName || currentVA.first_name} ${lastName || currentVA.last_name}`,
              job_role: jobRole || currentVA.job_role,
              phone_number: phoneNumber || currentVA.phone_number || "",
              is_virtual_assistant: true,
            });
        }

        // Update user role
        await serviceClient
          .from("user_roles")
          .upsert({
            user_id: currentVA.user_id,
            organization_id: organizationId,
            role: "user",
          }, { onConflict: "user_id,organization_id" });
      }
    }

    console.log(`Virtual Assistant updated: ${vaId}`);

    return new Response(
      JSON.stringify({
        success: true,
        va: updatedVA,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-virtual-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
