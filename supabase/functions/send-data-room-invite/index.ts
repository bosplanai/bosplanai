import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  organizationId: string;
  dataRoomId: string;
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
    const siteUrl = Deno.env.get("SITE_URL") || "https://bosplansupabase.lovable.app";

    console.log("send-data-room-invite function called");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create user client for auth verification
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviterId = claimsData.claims.sub;

    const { email, organizationId, dataRoomId }: InviteRequest = await req.json();

    console.log("Processing data room invite:", { email, organizationId, dataRoomId, inviterId });

    // Validate input
    if (!email || !organizationId || !dataRoomId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify inviter is admin or moderator of this organization
    const { data: inviterRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", inviterId)
      .eq("organization_id", organizationId)
      .single();

    const allowedRoles = ["admin", "moderator"];
    if (roleError || !inviterRole?.role || !allowedRoles.includes(inviterRole.role)) {
      return new Response(
        JSON.stringify({ error: "Only admins and managers can invite users to data rooms" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the data room details
    const { data: dataRoom, error: roomError } = await supabaseAdmin
      .from("data_rooms")
      .select("id, name, organization_id, nda_required")
      .eq("id", dataRoomId)
      .single();

    if (roomError || !dataRoom) {
      console.error("Data room fetch error:", roomError);
      return new Response(
        JSON.stringify({ error: "Data room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization name
    const { data: organization } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    const organizationName = organization?.name || "Organization";

    // Get inviter's name for the email
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", inviterId)
      .single();

    const inviterName = inviterProfile?.full_name || "A team member";

    // Check for existing pending invite - if found, update and resend instead of rejecting
    const { data: existingInvite } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, access_id")
      .eq("data_room_id", dataRoomId)
      .ilike("email", email)
      .eq("status", "pending")
      .maybeSingle();

    let invite;

    if (existingInvite) {
      // Update the existing invite with a new expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: updatedInvite, error: updateError } = await supabaseAdmin
        .from("data_room_invites")
        .update({
          expires_at: expiresAt.toISOString(),
          invited_by: inviterId,
        })
        .eq("id", existingInvite.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating invite:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to resend invitation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      invite = updatedInvite;
      console.log("Resending existing invitation:", invite.id);
    } else {
      // Create new invite record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data: newInvite, error: inviteError } = await supabaseAdmin
        .from("data_room_invites")
        .insert({
          email: email.toLowerCase(),
          data_room_id: dataRoomId,
          organization_id: organizationId,
          invited_by: inviterId,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return new Response(
          JSON.stringify({ error: "Failed to create invitation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      invite = newInvite;
      console.log("Created new invitation:", invite.id);
    }

    // Generate the invite link using the access_id (auto-generated by trigger)
    const inviteLink = `${siteUrl}/data-room-invite?token=${invite.access_id || invite.id}`;

    // Send invitation email if Resend is configured
    if (resendApiKey) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>You've been invited to a secure Data Room</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
              .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #0d7377; margin-bottom: 10px; font-size: 28px; }
              .room-card { background: linear-gradient(135deg, #0d7377 0%, #14919b 100%); color: white; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0; }
              .room-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
              .org-name { font-size: 14px; opacity: 0.9; }
              .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .details-row:last-child { border-bottom: none; }
              .details-label { color: #666; }
              .details-value { font-weight: 500; }
              .cta-button { display: block; background-color: #0d7377; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 32px auto; max-width: 280px; }
              .cta-button:hover { background-color: #0b6366; }
              .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
              .expire-note { color: #666; font-size: 13px; text-align: center; margin-top: 16px; }
              .nda-note { background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 16px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔒 Secure Data Room Invitation</h1>
                <p>${inviterName} has invited you to access a secure data room</p>
              </div>
              
              <div class="room-card">
                <div class="room-name">${dataRoom.name}</div>
                <div class="org-name">${organizationName}</div>
              </div>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Your email:</span>
                  <span class="details-value">${email}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Invited by:</span>
                  <span class="details-value">${inviterName}</span>
                </div>
              </div>
              
              <p style="text-align: center;">Click the button below to access the data room:</p>
              
              <a href="${inviteLink}" class="cta-button">
                Access Data Room
              </a>
              
              ${dataRoom.nda_required ? '<div class="nda-note">⚠️ This data room requires signing a Non-Disclosure Agreement before access.</div>' : ''}
              
              <p class="expire-note">This invitation expires in 30 days.</p>
              
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 16px;">
                  <strong>BosPlan</strong><br>
                  Secure Document Sharing
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `${inviterName} invited you to access ${dataRoom.name} on BosPlan`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Resend API error:", errorText);
        } else {
          console.log("Data room invitation email sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("Resend API key not configured, skipping email");
    }

    console.log("Data room invite created successfully:", invite.id);

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          status: invite.status,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
          access_id: invite.access_id,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-data-room-invite function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
