import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CustomButton {
  id?: string;
  title: string;
  icon: string;
  url: string;
  is_enabled: boolean;
  position: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create user client to verify authentication
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, button } = body;

    switch (action) {
      case "list": {
        const { data: buttons, error } = await supabaseAdmin
          .from("custom_nav_buttons")
          .select("*")
          .order("position", { ascending: true });

        if (error) throw error;
        return new Response(
          JSON.stringify({ buttons }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        const { title, icon, url, is_enabled = true, position = 0 } = button as CustomButton;
        
        if (!title || !url) {
          return new Response(
            JSON.stringify({ error: "Title and URL are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newButton, error } = await supabaseAdmin
          .from("custom_nav_buttons")
          .insert({
            title,
            icon: icon || "link",
            url,
            is_enabled,
            position,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ button: newButton }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        const { id, ...updates } = button as CustomButton & { id: string };
        
        if (!id) {
          return new Response(
            JSON.stringify({ error: "Button ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: updatedButton, error } = await supabaseAdmin
          .from("custom_nav_buttons")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ button: updatedButton }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { id } = button as { id: string };
        
        if (!id) {
          return new Response(
            JSON.stringify({ error: "Button ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseAdmin
          .from("custom_nav_buttons")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reorder": {
        const { buttons } = body as { buttons: { id: string; position: number }[] };
        
        for (const btn of buttons) {
          await supabaseAdmin
            .from("custom_nav_buttons")
            .update({ position: btn.position })
            .eq("id", btn.id);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Error in manage-custom-buttons:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
