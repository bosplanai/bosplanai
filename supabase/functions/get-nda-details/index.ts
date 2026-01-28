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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get query parameters
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    console.log("get-nda-details called:", { token, email });

    if (!token || !email) {
      return new Response(
        JSON.stringify({ error: "Missing token or email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the invite by access_id (token) or id
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select(`
        id,
        email,
        status,
        expires_at,
        access_id,
        nda_signed_at,
        guest_name,
        data_room_id,
        organization_id
      `)
      .or(`access_id.eq.${token},id.eq.${token}`)
      .single();

    if (inviteError || !invite) {
      console.error("Invite lookup error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the email matches
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Email does not match this invitation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite is still valid
    if (invite.status !== "pending" && invite.status !== "accepted") {
      return new Response(
        JSON.stringify({ error: "This invitation is no longer valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get data room details
    const { data: dataRoom, error: roomError } = await supabaseAdmin
      .from("data_rooms")
      .select(`
        id,
        name,
        nda_required,
        nda_content,
        organization_id
      `)
      .eq("id", invite.data_room_id)
      .single();

    if (roomError || !dataRoom) {
      console.error("Data room lookup error:", roomError);
      return new Response(
        JSON.stringify({ error: "Data room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization name
    const { data: organization } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", dataRoom.organization_id)
      .single();

    console.log("Returning invite details for:", invite.email);

    return new Response(
      JSON.stringify({
        invite: {
          email: invite.email,
          ndaSigned: !!invite.nda_signed_at,
          ndaSignedAt: invite.nda_signed_at,
          guestName: invite.guest_name,
          accessId: invite.access_id,
        },
        data_room: {
          id: dataRoom.id,
          name: dataRoom.name,
          nda_required: dataRoom.nda_required,
          nda_content: dataRoom.nda_content,
          organization: {
            name: organization?.name || "",
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-nda-details:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
