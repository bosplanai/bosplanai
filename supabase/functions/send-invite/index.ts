import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrganizationInvite {
  organizationId: string;
  organizationName: string;
  role: string; // admin, member, viewer
}

interface InviteRequest {
  email: string;
  fullName?: string;
  // Single org invite (backwards compatible)
  role?: string;
  organizationId?: string;
  organizationName?: string;
  // Multi-org invite (new)
  organizations?: OrganizationInvite[];
}

const roleLabels: Record<string, string> = {
  admin: "Full Access",
  member: "Manager",
  viewer: "Team"
};

const mapRoleToDbRole = (role: string): string => {
  // Map UI roles to the values stored in organization_invites
  // The invite table uses: admin, member, viewer
  // The user_roles table uses app_role enum: admin, moderator, user
  const validRoles = ["admin", "member", "viewer"];
  const mappedRole = role === "moderator" ? "member" : role;
  return validRoles.includes(mappedRole) ? mappedRole : "viewer";
};

const mapRoleToAppRole = (role: string): string => {
  // Map invite roles to app_role enum for user_roles table
  switch (role) {
    case "admin": return "admin";
    case "member": return "moderator";
    case "viewer": return "user";
    default: return "user";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "BosPlan <noreply@bosplan.com>";
    const siteUrl = Deno.env.get("SITE_URL") || "https://bosplansupabase.lovable.app";
    
    console.log("send-invite function called");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

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

    const body: InviteRequest = await req.json();
    const { email, fullName } = body;

    // Build organizations array from either single or multi-org format
    let organizations: OrganizationInvite[] = [];
    
    if (body.organizations && body.organizations.length > 0) {
      organizations = body.organizations;
    } else if (body.organizationId && body.organizationName) {
      organizations = [{
        organizationId: body.organizationId,
        organizationName: body.organizationName,
        role: body.role || "viewer"
      }];
    }

    console.log("Processing invite:", { email, organizations, inviterId });

    // Validate input
    if (!email || organizations.length === 0) {
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

    // Verify inviter is admin of all specified organizations
    for (const org of organizations) {
      const { data: inviterRole, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", inviterId)
        .eq("organization_id", org.organizationId)
        .single();

      if (roleError || inviterRole?.role !== "admin") {
        return new Response(
          JSON.stringify({ error: `Only admins can invite to ${org.organizationName}` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", inviterId)
      .single();

    const inviterName = inviterProfile?.full_name || "A team administrator";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    const results: { orgId: string; orgName: string; role: string; status: string; inviteId?: string; token?: string }[] = [];
    let userAlreadyExists = !!existingUser;

    // IMPORTANT: Clean up any existing pending invites for this email from organizations 
    // where the inviter is admin. This ensures that when a new invite is sent, only the 
    // newly selected organizations are included (not stale invites from previous sessions).
    if (!existingUser) {
      // Get all org IDs where inviter is admin
      const { data: inviterAdminOrgs } = await supabaseAdmin
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", inviterId)
        .eq("role", "admin");

      if (inviterAdminOrgs && inviterAdminOrgs.length > 0) {
        const adminOrgIds = inviterAdminOrgs.map(o => o.organization_id);
        
        // Delete all pending invites for this email from orgs where inviter is admin
        const { error: deleteError } = await supabaseAdmin
          .from("organization_invites")
          .delete()
          .ilike("email", email)
          .eq("status", "pending")
          .in("organization_id", adminOrgIds);

        if (deleteError) {
          console.log("Warning: Could not clean up old pending invites:", deleteError.message);
        } else {
          console.log("Cleaned up existing pending invites for", email, "from admin's organizations");
        }
      }
    }

    // Process each organization
    for (const org of organizations) {
      const mappedRole = mapRoleToDbRole(org.role);
      const appRole = mapRoleToAppRole(mappedRole);

      // Check if user is already a member of this organization
      if (existingUser) {
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", existingUser.id)
          .eq("organization_id", org.organizationId)
          .maybeSingle();

        if (existingRole) {
          results.push({
            orgId: org.organizationId,
            orgName: org.organizationName,
            role: mappedRole,
            status: "already_member"
          });
          continue;
        }

        // Add existing user directly to the organization
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: existingUser.id,
            organization_id: org.organizationId,
            role: appRole,
          });

        if (roleError) {
          console.error("Error adding user role:", roleError);
          results.push({
            orgId: org.organizationId,
            orgName: org.organizationName,
            role: mappedRole,
            status: "error"
          });
          continue;
        }

        // Create accepted invite record for tracking
        const { data: acceptedInvite } = await supabaseAdmin
          .from("organization_invites")
          .insert({
            email: email.toLowerCase(),
            role: mappedRole,
            organization_id: org.organizationId,
            invited_by: inviterId,
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .select()
          .single();

        results.push({
          orgId: org.organizationId,
          orgName: org.organizationName,
          role: mappedRole,
          status: "added_directly",
          inviteId: acceptedInvite?.id
        });
      } else {
        // Check for existing pending invite
        const { data: existingInvite } = await supabaseAdmin
          .from("organization_invites")
          .select("id, token")
          .eq("organization_id", org.organizationId)
          .ilike("email", email)
          .eq("status", "pending")
          .maybeSingle();

        if (existingInvite) {
          results.push({
            orgId: org.organizationId,
            orgName: org.organizationName,
            role: mappedRole,
            status: "already_pending",
            inviteId: existingInvite.id,
            token: existingInvite.token
          });
          continue;
        }

        // Create new pending invite (2 day expiry as per spec)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 2);

        const { data: newInvite, error: inviteError } = await supabaseAdmin
          .from("organization_invites")
          .insert({
            email: email.toLowerCase(),
            role: mappedRole,
            organization_id: org.organizationId,
            invited_by: inviterId,
            status: "pending",
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (inviteError) {
          console.error("Error creating invite:", inviteError);
          results.push({
            orgId: org.organizationId,
            orgName: org.organizationName,
            role: mappedRole,
            status: "error"
          });
          continue;
        }

        results.push({
          orgId: org.organizationId,
          orgName: org.organizationName,
          role: mappedRole,
          status: "pending",
          inviteId: newInvite.id,
          token: newInvite.token
        });
      }
    }

    // Check if we have any successful invites/additions
    const successfulResults = results.filter(r => r.status !== "error");
    if (successfulResults.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to process invitations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if all orgs already have the user as member
    const allAlreadyMember = results.every(r => r.status === "already_member");
    if (allAlreadyMember) {
      return new Response(
        JSON.stringify({ error: "User is already a member of all selected organizations" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get first pending invite token for email link
    const pendingResults = results.filter(r => r.status === "pending" && r.token);
    const firstToken = pendingResults[0]?.token;
    const acceptInviteLink = firstToken ? `${siteUrl}/accept-invite?token=${firstToken}` : siteUrl;
    const dashboardLink = `${siteUrl}/tasks`;

    // Build organization permissions table for email
    const orgTableRows = results
      .filter(r => r.status !== "error" && r.status !== "already_member")
      .map(r => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 500;">${r.orgName}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="display: inline-block; background: ${r.role === 'admin' ? '#0d7377' : r.role === 'member' ? '#6366f1' : '#64748b'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
              ${roleLabels[r.role] || r.role}
            </span>
          </td>
        </tr>
      `).join('');

    // Send email notification
    if (resendApiKey) {
      const isExistingUserEmail = userAlreadyExists;
      
      const emailHtml = isExistingUserEmail ? `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>You've been added to new organisations on BosPlan</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
              .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #0d7377; margin-bottom: 10px; font-size: 28px; }
              .message { text-align: center; margin-bottom: 24px; color: #666; }
              .org-table { width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
              .org-table th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-weight: 600; color: #333; }
              .org-table th:last-child { text-align: center; }
              .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .details-row:last-child { border-bottom: none; }
              .details-label { color: #666; }
              .details-value { font-weight: 500; }
              .cta-button { display: block; background-color: #0d7377; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 32px auto; max-width: 280px; }
              .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You've Been Added! 🎉</h1>
              </div>
              
              <p class="message">${inviterName} has added you to the following organisation(s) on BosPlan:</p>
              
              <table class="org-table">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Access Level</th>
                  </tr>
                </thead>
                <tbody>
                  ${orgTableRows}
                </tbody>
              </table>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Your email:</span>
                  <span class="details-value">${email}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Added by:</span>
                  <span class="details-value">${inviterName}</span>
                </div>
              </div>
              
              <p style="text-align: center;">You already have a BosPlan account. Simply log in to access your new organisation(s):</p>
              
              <a href="${dashboardLink}" class="cta-button">
                Go to Dashboard
              </a>
              
              <div class="footer">
                <p>You can switch between organisations using the organisation switcher in the dashboard.</p>
                <p style="margin-top: 16px;">
                  <strong>BosPlan</strong><br>
                  Your Business Operations Platform
                </p>
              </div>
            </div>
          </body>
        </html>
      ` : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>You've Been Invited to Join a Team on BosPlan</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
              .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #0d7377; margin-bottom: 10px; font-size: 28px; }
              .message { text-align: center; margin-bottom: 24px; color: #666; }
              .org-table { width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
              .org-table th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-weight: 600; color: #333; }
              .org-table th:last-child { text-align: center; }
              .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0; }
              .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .details-row:last-child { border-bottom: none; }
              .details-label { color: #666; }
              .details-value { font-weight: 500; }
              .cta-button { display: block; background-color: #0d7377; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 32px auto; max-width: 320px; }
              .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
              .expire-note { color: #666; font-size: 13px; text-align: center; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited! 🎉</h1>
              </div>
              
              <p class="message">${inviterName} has invited you to join their team on the following organisation(s):</p>
              
              <table class="org-table">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Access Level</th>
                  </tr>
                </thead>
                <tbody>
                  ${orgTableRows}
                </tbody>
              </table>
              
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
              
              <p style="text-align: center;">Click the button below to accept your invitation and set up your account:</p>
              
              <a href="${acceptInviteLink}" class="cta-button">
                Accept Invitation & Log In
              </a>
              
              <p class="expire-note">This invitation expires in 2 days.</p>
              
              <div class="footer">
                <p>If you were not expecting this invitation, please ignore it.</p>
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
        const orgNames = results
          .filter(r => r.status !== "error" && r.status !== "already_member")
          .map(r => r.orgName)
          .join(", ");
        
        const emailSubject = userAlreadyExists 
          ? `${inviterName} added you to ${orgNames} on BosPlan`
          : `You've Been Invited to Join a Team on BosPlan 🎉`;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Resend API error:", errorText);
        } else {
          console.log("Email sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("Resend API key not configured, skipping email");
    }

    console.log("Invite processing completed:", results);

    // Return the first invite for backwards compatibility, plus full results
    const firstInvite = results.find(r => r.inviteId);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        userAddedDirectly: userAlreadyExists,
        results,
        invite: firstInvite ? {
          id: firstInvite.inviteId,
          email: email.toLowerCase(),
          role: firstInvite.role,
          status: firstInvite.status,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        } : null
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
