import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
  fullName?: string;
}

const roleLabels: Record<string, string> = {
  admin: "Full Access",
  member: "Manager",
  viewer: "Team"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "BosPlan <noreply@bosplan.com>";
    const siteUrl = Deno.env.get("SITE_URL") || "https://bosplansupabase.lovable.app";
    
    console.log("send-invite function called, Resend API key configured:", !!resendApiKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for user operations
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

    const { email, role, organizationId, organizationName, fullName }: InviteRequest = await req.json();

    console.log("Processing invite:", { email, role, organizationId, organizationName, inviterId });

    // Validate input
    if (!email || !organizationId || !organizationName) {
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

    // Validate role - map to app_role enum values
    const validRoles = ["admin", "member", "viewer"];
    const mappedRole = role === "moderator" ? "member" : role; // Handle legacy role names
    if (!validRoles.includes(mappedRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify inviter is admin of this organization
    const { data: inviterRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", inviterId)
      .eq("organization_id", organizationId)
      .single();

    if (roleError || inviterRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can invite team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inviter's name for the email
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", inviterId)
      .single();

    const inviterName = inviterProfile?.full_name || "A team administrator";

    // Check if user already exists in this organization
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Check if user is already a member of this organization
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: "User is already a member of this organization" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabaseAdmin
      .from("organization_invites")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "An invitation is already pending for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the invite record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("organization_invites")
      .insert({
        email: email.toLowerCase(),
        role: mappedRole,
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

    // Generate the accept invite link (uses the invite ID as token)
    const acceptInviteLink = `${siteUrl}/accept-invite?token=${invite.id}`;
    const roleLabel = roleLabels[mappedRole] || mappedRole;

    // Send invitation email if Resend is configured
    if (resendApiKey) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>You've been invited to join ${organizationName}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
              .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #0d7377; margin-bottom: 10px; font-size: 28px; }
              .org-card { background: linear-gradient(135deg, #0d7377 0%, #14919b 100%); color: white; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0; }
              .org-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
              .role-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 14px; }
              .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .details-row:last-child { border-bottom: none; }
              .details-label { color: #666; }
              .details-value { font-weight: 500; }
              .cta-button { display: block; background-color: #0d7377; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 32px auto; max-width: 280px; }
              .cta-button:hover { background-color: #0b6366; }
              .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
              .expire-note { color: #666; font-size: 13px; text-align: center; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited! 🎉</h1>
                <p>${inviterName} has invited you to join their team on BosPlan</p>
              </div>
              
              <div class="org-card">
                <div class="org-name">${organizationName}</div>
                <div class="role-badge">${roleLabel} Access</div>
              </div>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Your email:</span>
                  <span class="details-value">${email}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Access level:</span>
                  <span class="details-value">${roleLabel}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Invited by:</span>
                  <span class="details-value">${inviterName}</span>
                </div>
              </div>
              
              <p style="text-align: center;">Click the button below to set up your account and join the team:</p>
              
              <a href="${acceptInviteLink}" class="cta-button">
                Accept Invitation
              </a>
              
              <p class="expire-note">This invitation expires in 7 days.</p>
              
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 16px;">
                  <strong>BosPlan</strong><br>
                  Your Business Operations Platform
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
            subject: `${inviterName} invited you to join ${organizationName} on BosPlan`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Resend API error:", errorText);
          // Don't fail the whole request if email fails
        } else {
          console.log("Invitation email sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.log("Resend API key not configured, skipping email");
    }

    console.log("Invite created successfully:", invite.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-invite function:", error);
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
