import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignNdaRequest {
  token: string;
  signerName: string;
  signerEmail: string;
}

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

    const { token, signerName, signerEmail }: SignNdaRequest = await req.json();

    console.log("sign-nda called:", { token, signerName, signerEmail });

    if (!token || !signerName || !signerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the invite by access_id or id
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select(`
        id,
        email,
        status,
        expires_at,
        data_room_id,
        nda_signed_at
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
    if (invite.email.toLowerCase() !== signerEmail.toLowerCase()) {
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

    // Check if already signed
    if (invite.nda_signed_at) {
      return new Response(
        JSON.stringify({ success: true, message: "NDA already signed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the data room to get the NDA content hash
    const { data: dataRoom } = await supabaseAdmin
      .from("data_rooms")
      .select("nda_content, nda_content_hash, organization_id")
      .eq("id", invite.data_room_id)
      .single();

    // Get client IP for audit trail
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Create NDA signature record
    const { error: signatureError } = await supabaseAdmin
      .from("data_room_nda_signatures")
      .insert({
        data_room_id: invite.data_room_id,
        signer_name: signerName,
        signer_email: signerEmail.toLowerCase(),
        ip_address: clientIp,
        nda_content_hash: dataRoom?.nda_content_hash || null,
      });

    if (signatureError) {
      console.error("Error creating signature:", signatureError);
      return new Response(
        JSON.stringify({ error: "Failed to record NDA signature" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the invite to mark NDA as signed
    const { error: updateError } = await supabaseAdmin
      .from("data_room_invites")
      .update({
        nda_signed_at: new Date().toISOString(),
        guest_name: signerName,
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Error updating invite:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    if (dataRoom) {
      await supabaseAdmin.from("data_room_activity").insert({
        data_room_id: invite.data_room_id,
        organization_id: dataRoom.organization_id,
        user_name: signerName,
        user_email: signerEmail.toLowerCase(),
        action: "nda_signed",
        is_guest: true,
        details: { ip_address: clientIp },
      });
    }

    console.log("NDA signed successfully for:", signerEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in sign-nda:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
