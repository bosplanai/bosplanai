import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AcceptInviteRequest {
  token: string;
  email: string;
  origin?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "BosPlan <noreply@bosplan.com>";

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { token, email, origin }: AcceptInviteRequest = await req.json();

    console.log("accept-data-room-invite called:", { token, email });

    if (!token || !email) {
      return new Response(
        JSON.stringify({ error: "Missing token or email" }),
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
        organization_id,
        access_id,
        nda_signed_at,
        guest_name
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

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the data room details
    const { data: dataRoom } = await supabaseAdmin
      .from("data_rooms")
      .select("id, name, nda_required, organization_id")
      .eq("id", invite.data_room_id)
      .single();

    // Check if NDA is required and signed
    if (dataRoom?.nda_required && !invite.nda_signed_at) {
      return new Response(
        JSON.stringify({ error: "NDA must be signed before accepting this invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark the invite as accepted
    const { error: updateError } = await supabaseAdmin
      .from("data_room_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Error updating invite:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to accept invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    if (dataRoom) {
      await supabaseAdmin.from("data_room_activity").insert({
        data_room_id: invite.data_room_id,
        organization_id: dataRoom.organization_id,
        user_name: invite.guest_name || email.split("@")[0],
        user_email: email.toLowerCase(),
        action: "invite_accepted",
        is_guest: true,
      });
    }

    // Send confirmation email with access link
    const siteUrl = origin || "https://bosplansupabase.lovable.app";
    const accessLink = `${siteUrl}/guest-dataroom?accessId=${invite.access_id}`;

    if (resendApiKey && dataRoom) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Data Room Access Confirmed</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
                .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #0d7377; margin-bottom: 10px; font-size: 28px; }
                .cta-button { display: block; background-color: #0d7377; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 32px auto; max-width: 280px; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Access Confirmed</h1>
                  <p>You now have access to the <strong>${dataRoom.name}</strong> data room</p>
                </div>
                
                <p style="text-align: center;">Click the button below to view the data room:</p>
                
                <a href="${accessLink}" class="cta-button">
                  Access Data Room
                </a>
                
                <p style="text-align: center; color: #666; font-size: 13px;">
                  Bookmark this link to access the data room anytime.
                </p>
                
                <div class="footer">
                  <p><strong>BosPlan</strong><br>Secure Document Sharing</p>
                </div>
              </div>
            </body>
          </html>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `Access confirmed: ${dataRoom.name}`,
            html: emailHtml,
          }),
        });

        console.log("Confirmation email sent");
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    console.log("Invite accepted successfully:", invite.id);

    return new Response(
      JSON.stringify({
        success: true,
        accessId: invite.access_id,
        dataRoomId: invite.data_room_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in accept-data-room-invite:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
