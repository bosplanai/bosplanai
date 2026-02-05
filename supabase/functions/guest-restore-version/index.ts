import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RestoreVersionRequest {
  email: string;
  token: string;
  versionId: string;
}

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
    const { email, token, versionId } = body as RestoreVersionRequest;
    const actualPassword = token || body.password;

    console.log("guest-restore-version called:", { email, versionId });

    if (!email || !actualPassword || !versionId) {
      return new Response(
        JSON.stringify({ error: "Email, password, and versionId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify guest access
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, email, status, data_room_id, organization_id, access_password, guest_name, expires_at")
      .ilike("email", normalizedEmail)
      .eq("status", "accepted")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      console.error("Invite lookup error:", { inviteError, found: !!invite });
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password
    if (invite.access_password) {
      const passwordHash = await hashPassword(actualPassword.toUpperCase());
      if (invite.access_password !== passwordHash) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Access has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the version to restore
    const { data: versionToRestore, error: versionError } = await supabaseAdmin
      .from("data_room_files")
      .select("*")
      .eq("id", versionId)
      .is("deleted_at", null)
      .single();

    if (versionError || !versionToRestore) {
      return new Response(
        JSON.stringify({ error: "Version not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify file belongs to guest's data room
    if (versionToRestore.data_room_id !== invite.data_room_id) {
      return new Response(
        JSON.stringify({ error: "Access denied to this file" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the root file ID
    const rootFileId = versionToRestore.parent_file_id || versionToRestore.id;

    // Get all versions to calculate new version number
    const { data: allVersions } = await supabaseAdmin
      .from("data_room_files")
      .select("version")
      .eq("data_room_id", invite.data_room_id)
      .is("deleted_at", null)
      .or(`id.eq.${rootFileId},parent_file_id.eq.${rootFileId}`);

    const maxVersion = allVersions?.reduce((max, v) => Math.max(max, v.version || 1), 0) || 1;
    const newVersion = maxVersion + 1;

    // Create a new version based on the restored one
    const { data: newVersionData, error: insertError } = await supabaseAdmin
      .from("data_room_files")
      .insert({
        name: versionToRestore.name,
        file_path: versionToRestore.file_path,
        file_size: versionToRestore.file_size,
        mime_type: versionToRestore.mime_type,
        data_room_id: invite.data_room_id,
        organization_id: invite.organization_id,
        folder_id: versionToRestore.folder_id,
        is_restricted: versionToRestore.is_restricted,
        assigned_to: versionToRestore.assigned_to,
        assigned_guest_id: versionToRestore.assigned_guest_id,
        uploaded_by: versionToRestore.uploaded_by, // Keep original uploader
        parent_file_id: rootFileId,
        version: newVersion,
        status: versionToRestore.status || 'not_opened',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error("Error creating restored version:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to restore version" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If the version has document content, copy it to the new version
    const { data: docContent } = await supabaseAdmin
      .from("data_room_document_content")
      .select("content, content_type")
      .eq("file_id", versionId)
      .single();

    if (docContent && newVersionData) {
      await supabaseAdmin
        .from("data_room_document_content")
        .insert({
          file_id: newVersionData.id,
          data_room_id: invite.data_room_id,
          organization_id: invite.organization_id,
          content: docContent.content,
          content_type: docContent.content_type,
        });
    }

    // Log activity
    await supabaseAdmin.from("data_room_activity").insert({
      data_room_id: invite.data_room_id,
      organization_id: invite.organization_id,
      user_name: invite.guest_name || normalizedEmail.split("@")[0],
      user_email: normalizedEmail,
      action: "version_restored",
      is_guest: true,
      details: { 
        file_name: versionToRestore.name, 
        restored_version: versionToRestore.version,
        new_version: newVersion 
      },
    });

    console.log("Version restored successfully:", { 
      originalVersion: versionToRestore.version, 
      newVersion,
      newId: newVersionData?.id 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        newVersion,
        message: `Restored as version ${newVersion}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in guest-restore-version:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
