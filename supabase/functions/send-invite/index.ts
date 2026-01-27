import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
  fullName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@bosplan.com";

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

    // Validate role
    const validRoles = ["admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
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
        role,
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

    // Send invitation email if Resend is configured
    if (resendApiKey) {
      const inviteLink = `${Deno.env.get("SITE_URL") || "https://bosplansupabase.lovable.app"}/accept-invite?token=${invite.id}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>You've been invited to join ${organizationName}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0d7377; margin-bottom: 10px;">You're Invited!</h1>
            </div>
            
            <p>Hi${fullName ? ` ${fullName}` : ""},</p>
            
            <p>You've been invited to join <strong>${organizationName}</strong> on BosPlan as a <strong>${role}</strong>.</p>
            
            <p style="margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #0d7377; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </p>
            
            <p>This invitation will expire in 7 days.</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              The BosPlan Team
            </p>
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
            subject: `You've been invited to join ${organizationName} on BosPlan`,
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
