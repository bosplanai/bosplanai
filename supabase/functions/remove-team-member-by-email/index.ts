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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Get the calling user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, organizationId, removeFromAllOrgs, deleteFromPlatform } = await req.json();

    if (!email || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Email and organizationId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Removing user with email ${email} from organization ${organizationId}`);

    // Verify the calling user is an admin in this organization
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (roleError || callerRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can remove team members" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the user by email using admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to find user" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!targetUser) {
      console.log(`No user found with email ${email}`);
      // User might not have created an account yet, just return success
      return new Response(JSON.stringify({ success: true, message: "User not found, possibly not registered yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent removing yourself
    if (targetUser.id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot remove yourself from the organization" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (deleteFromPlatform) {
      // Complete deletion from platform - remove all data and auth user
      console.log(`Deleting user ${targetUser.id} from platform completely`);
      
      // First, remove all organization invites for this user
      const { error: deleteInvitesError } = await supabaseAdmin
        .from("organization_invites")
        .delete()
        .eq("email", email.toLowerCase());

      if (deleteInvitesError) {
        console.error("Error deleting invites:", deleteInvitesError);
        // Continue anyway - not critical
      }

      // Remove from all organizations
      const { error: deleteAllRolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id);

      if (deleteAllRolesError) {
        console.error("Error removing user roles:", deleteAllRolesError);
        return new Response(
          JSON.stringify({ error: "Failed to remove user from organizations" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Delete the user's profile
      const { error: deleteProfileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetUser.id);

      if (deleteProfileError) {
        console.error("Error deleting profile:", deleteProfileError);
        // Continue anyway - auth user deletion is more important
      }

      // Delete the auth user completely
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        return new Response(
          JSON.stringify({ error: "Failed to delete user account" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`User ${targetUser.id} completely deleted from platform`);
    } else if (removeFromAllOrgs) {
      // Remove from all organizations - delete all user_roles for this user
      const { error: deleteAllError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id);

      if (deleteAllError) {
        console.error("Error removing user from all orgs:", deleteAllError);
        return new Response(
          JSON.stringify({ error: "Failed to remove user from organizations" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Removed user ${targetUser.id} from all organizations`);
    } else {
      // Remove from specific organization only
      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUser.id)
        .eq("organization_id", organizationId);

      if (deleteError) {
        console.error("Error removing user role:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to remove user from organization" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Removed user ${targetUser.id} from organization ${organizationId}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in remove-team-member-by-email:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
