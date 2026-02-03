import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is super admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin using user_roles table
    const { data: superAdminCheck } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!superAdminCheck) {
      console.log("User is not a super admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Not a super admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { organization_id } = await req.json();
    console.log("Fetching stats for organization:", organization_id);

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch counts using service role (bypasses RLS)
    const [projectsResult, tasksResult, filesResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id),
      supabase
        .from("drive_files")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id)
        .is("deleted_at", null),
    ]);

    // Log results for debugging
    console.log("Projects result:", projectsResult.count, projectsResult.error);
    console.log("Tasks result:", tasksResult.count, tasksResult.error);
    console.log("Files result:", filesResult.count, filesResult.error);

    // Check for invoices table - it may not exist
    let invoicesCount = 0;
    try {
      const invoicesResult = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization_id);
      invoicesCount = invoicesResult.count || 0;
    } catch (e) {
      console.log("Invoices table not found, using 0");
    }

    const response = {
      projects_count: projectsResult.count || 0,
      tasks_count: tasksResult.count || 0,
      files_count: filesResult.count || 0,
      invoices_count: invoicesCount,
    };

    console.log("Returning stats:", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching org stats:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch statistics" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
