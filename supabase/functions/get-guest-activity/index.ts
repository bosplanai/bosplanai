import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GetActivityRequest {
  email: string;
  token: string;
}

// Helper function for SHA-256 password hash
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { email, token } = body as GetActivityRequest;
    const actualPassword = token || body.password;

    if (!email || !actualPassword) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify guest access
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, data_room_id, access_password, status, expires_at")
      .ilike("email", normalizedEmail)
      .eq("status", "accepted")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password
    const passwordHash = await hashPassword(actualPassword.toUpperCase());
    if (invite.access_password !== passwordHash) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Access has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch activity for this data room
    const { data: activities, error: activityError } = await supabaseAdmin
      .from("data_room_activity")
      .select("id, user_name, user_email, action, details, is_guest, created_at")
      .eq("data_room_id", invite.data_room_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (activityError) {
      console.error("Activity fetch error:", activityError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch activity" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ activities: activities || [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-guest-activity:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
