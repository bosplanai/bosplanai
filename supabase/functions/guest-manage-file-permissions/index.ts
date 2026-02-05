import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, email, token, password, fileId, isRestricted, permissions } = body;
    const actualPassword = password || token;

    console.log("guest-manage-file-permissions called:", { action, email, fileId, isRestricted, permissionsCount: permissions?.length });

    if (!email || !actualPassword) {
      return new Response(
        JSON.stringify({ error: "Missing credentials" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "Missing fileId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the password for verification
    const passwordHash = await hashPassword(actualPassword);

    // Find the guest invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, data_room_id, email, guest_name, nda_signed_at")
      .eq("email", email.toLowerCase())
      .eq("access_password", passwordHash)
      .not("nda_signed_at", "is", null)
      .maybeSingle();

    if (inviteError || !invite) {
      console.error("Invalid guest credentials:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid credentials or NDA not signed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the file and verify it exists in this data room
    const { data: file, error: fileError } = await supabaseAdmin
      .from("data_room_files")
      .select("id, name, data_room_id, organization_id, uploaded_by, is_restricted")
      .eq("id", fileId)
      .eq("data_room_id", invite.data_room_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fileError || !file) {
      console.error("File not found:", fileError);
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the guest uploaded this file (only they can manage permissions)
    // Guests who uploaded files have their invite id stored somewhere or we need to track this
    // For now, we'll check if this guest is the uploader by checking data_room_invites
    // The file.uploaded_by would be null for guest uploads - instead we need to check assigned_guest_id
    // Actually guests might have files assigned to them OR might have uploaded via their session
    // Let's check if the guest uploaded this file by looking at the guest file uploads pattern
    
    // For guest uploads, we track via a custom pattern - check if guest uploaded via their session
    // Unfortunately the current schema doesn't track guest uploaders directly
    // We'll need to either:
    // 1. Allow guests to only manage permissions if they uploaded the file (need schema change)
    // 2. Or allow any guest with edit permission on the file to manage permissions
    
    // For now, since we can't verify guest ownership, we'll check if guest has edit access
    // and restrict to files they have explicit edit permission for
    const { data: existingPermission } = await supabaseAdmin
      .from("data_room_file_permissions")
      .select("permission_level")
      .eq("file_id", fileId)
      .eq("guest_invite_id", invite.id)
      .maybeSingle();

    // Guests can only manage permissions if:
    // 1. The file is not currently restricted (unrestricted files give edit access to all)
    // 2. OR they have explicit edit permission
    const canManage = !file.is_restricted || existingPermission?.permission_level === "edit";

    if (!canManage && action === "set") {
      return new Response(
        JSON.stringify({ error: "You don't have permission to manage this file's restrictions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      // Return available members and current permissions
      
      // Get all team members in this data room
      const { data: teamMembers } = await supabaseAdmin
        .from("data_room_members")
        .select(`
          id,
          user_id,
          user:profiles!data_room_members_user_id_fkey(id, full_name)
        `)
        .eq("data_room_id", invite.data_room_id);

      // Get data room creator
      const { data: dataRoom } = await supabaseAdmin
        .from("data_rooms")
        .select("created_by")
        .eq("id", invite.data_room_id)
        .single();

      // Get creator profile if not in team members
      let creatorProfile = null;
      if (dataRoom?.created_by) {
        const creatorInTeam = teamMembers?.some(m => m.user_id === dataRoom.created_by);
        if (!creatorInTeam) {
          const { data: creator } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name")
            .eq("id", dataRoom.created_by)
            .maybeSingle();
          creatorProfile = creator;
        }
      }

      // Get all NDA-signed guests
      const { data: guests } = await supabaseAdmin
        .from("data_room_invites")
        .select("id, email, guest_name")
        .eq("data_room_id", invite.data_room_id)
        .not("nda_signed_at", "is", null);

      // Get existing permissions for this file
      const { data: existingPerms } = await supabaseAdmin
        .from("data_room_file_permissions")
        .select("id, user_id, guest_invite_id, permission_level")
        .eq("file_id", fileId);

      const availableMembers = {
        team: [
          ...(creatorProfile ? [{
            id: creatorProfile.id,
            uniqueId: `team-${creatorProfile.id}`,
            referenceId: creatorProfile.id,
            name: creatorProfile.full_name || "Data Room Owner",
            type: "team",
            isCreator: true,
          }] : []),
          ...(teamMembers || []).map((m: any) => ({
            id: m.id,
            uniqueId: `team-${m.user_id}`,
            referenceId: m.user_id,
            name: m.user?.full_name || "Unknown",
            type: "team",
            isCreator: m.user_id === dataRoom?.created_by,
          })),
        ],
        guests: (guests || [])
          .filter(g => g.id !== invite.id) // Exclude current guest
          .map(g => ({
            id: g.id,
            uniqueId: `guest-${g.id}`,
            referenceId: g.id,
            name: g.guest_name || g.email,
            type: "guest",
          })),
      };

      const currentPermissions = (existingPerms || []).map(p => ({
        referenceId: p.user_id || p.guest_invite_id,
        permission: p.permission_level,
        type: p.user_id ? "team" : "guest",
      }));

      return new Response(
        JSON.stringify({
          success: true,
          file: {
            id: file.id,
            name: file.name,
            is_restricted: file.is_restricted,
          },
          availableMembers,
          currentPermissions,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set") {
      // Update file restriction status
      const { error: updateError } = await supabaseAdmin
        .from("data_room_files")
        .update({ is_restricted: isRestricted })
        .eq("id", fileId);

      if (updateError) {
        console.error("Failed to update file:", updateError);
        throw updateError;
      }

      // Delete existing permissions
      const { error: deleteError } = await supabaseAdmin
        .from("data_room_file_permissions")
        .delete()
        .eq("file_id", fileId);

      if (deleteError) {
        console.error("Failed to delete permissions:", deleteError);
        throw deleteError;
      }

      // Insert new permissions if restricted
      if (isRestricted && permissions && permissions.length > 0) {
        const teamPermissions = permissions
          .filter((p: any) => p.type === "team")
          .map((p: any) => ({
            file_id: fileId,
            user_id: p.referenceId,
            guest_invite_id: null,
            permission_level: p.permissionLevel || "view",
          }));

        const guestPermissions = permissions
          .filter((p: any) => p.type === "guest")
          .map((p: any) => ({
            file_id: fileId,
            user_id: null,
            guest_invite_id: p.referenceId,
            permission_level: p.permissionLevel || "view",
          }));

        const allPermissions = [...teamPermissions, ...guestPermissions];

        if (allPermissions.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from("data_room_file_permissions")
            .insert(allPermissions);

          if (insertError) {
            console.error("Failed to insert permissions:", insertError);
            throw insertError;
          }
        }
      }

      // Log activity
      await supabaseAdmin.from("data_room_activity").insert({
        data_room_id: invite.data_room_id,
        organization_id: file.organization_id,
        user_id: null,
        user_name: invite.guest_name || "Guest",
        user_email: email,
        action: "permissions_changed",
        details: {
          file_name: file.name,
          file_id: fileId,
          is_restricted: isRestricted,
          granted_to_count: permissions?.length || 0,
        },
        is_guest: true,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in guest-manage-file-permissions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
