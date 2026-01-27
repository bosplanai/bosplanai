import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify super_admin status
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify super_admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Super admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to access auth.users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id } = await req.json();

    // Fetch profiles for the organization
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, full_name, job_role, organization_id")
      .eq("organization_id", organization_id);

    if (profilesError) throw profilesError;

    // Get user emails from auth.users
    const userIds = (profiles || []).map((p) => p.id);
    
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch auth users to get emails
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers();
    
    if (authError) throw authError;

    // Create a map of user_id to email
    const emailMap = new Map<string, string>();
    (authUsers || []).forEach((authUser) => {
      if (userIds.includes(authUser.id)) {
        emailMap.set(authUser.id, authUser.email || "");
      }
    });

    // Fetch user roles
    const { data: userRoles } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap = new Map<string, string>();
    (userRoles || []).forEach((r) => {
      roleMap.set(r.user_id, r.role);
    });

    // Combine profile data with emails and roles
    const usersWithEmails = (profiles || []).map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      job_role: profile.job_role,
      email: emailMap.get(profile.id) || "",
      role: roleMap.get(profile.id) || "member",
    }));

    return new Response(JSON.stringify({ users: usersWithEmails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
