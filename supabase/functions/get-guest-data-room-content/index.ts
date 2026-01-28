import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GetContentRequest {
  email: string;
  password: string;
  folderId?: string | null;
}

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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
    const { email, password, folderId } = body as GetContentRequest;
    
    // Support legacy token field as password for backward compatibility
    const actualPassword = password || body.token;

    console.log("get-guest-data-room-content called:", { email, folderId, hasPassword: !!actualPassword });

    if (!email || !actualPassword) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided password
    const hashedPassword = await hashPassword(actualPassword.toUpperCase());

    // Look up the invite by email and hashed password
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select(`
        id,
        email,
        status,
        expires_at,
        data_room_id,
        organization_id,
        guest_name,
        access_password,
        nda_signed_at
      `)
      .ilike("email", email)
      .eq("status", "accepted")
      .single();

    if (inviteError || !invite) {
      console.error("Invite lookup error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid credentials or no access to any data room" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password matches
    if (invite.access_password !== hashedPassword) {
      console.error("Password mismatch");
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Your access has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get data room details
    const { data: dataRoom, error: roomError } = await supabaseAdmin
      .from("data_rooms")
      .select(`
        id,
        name,
        description,
        nda_required,
        nda_content_hash,
        organization_id,
        organization:organizations(name)
      `)
      .eq("id", invite.data_room_id)
      .single();

    if (roomError || !dataRoom) {
      console.error("Data room fetch error:", roomError);
      return new Response(
        JSON.stringify({ error: "Data room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if NDA re-signing is required (NDA updated after guest signed)
    if (dataRoom.nda_required && invite.nda_signed_at) {
      const { data: signature } = await supabaseAdmin
        .from("data_room_nda_signatures")
        .select("nda_content_hash")
        .eq("data_room_id", dataRoom.id)
        .ilike("signer_email", email)
        .order("signed_at", { ascending: false })
        .limit(1)
        .single();

      if (signature && dataRoom.nda_content_hash && signature.nda_content_hash !== dataRoom.nda_content_hash) {
        return new Response(
          JSON.stringify({ 
            error: "The NDA has been updated. Please re-sign to continue.",
            code: "NDA_UPDATED"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get folders in current directory
    const { data: folders } = await supabaseAdmin
      .from("data_room_folders")
      .select("id, name, created_at")
      .eq("data_room_id", dataRoom.id)
      .is("deleted_at", null)
      .eq("parent_id", folderId || null as any)
      .order("name");

    // Get files in current directory
    const { data: files } = await supabaseAdmin
      .from("data_room_files")
      .select("id, name, file_path, file_size, mime_type, created_at, updated_at, folder_id, is_restricted, uploaded_by")
      .eq("data_room_id", dataRoom.id)
      .is("deleted_at", null)
      .eq("folder_id", folderId || null as any)
      .order("name");

    // Filter restricted files - get guest's permissions
    const fileIds = files?.map(f => f.id) || [];
    let accessibleFiles = files || [];

    if (fileIds.length > 0) {
      // For guests, we need to check file permissions differently
      // Get all file permissions for this guest (by email match in invite)
      const { data: filePermissions } = await supabaseAdmin
        .from("data_room_file_permissions")
        .select("file_id, permission_level")
        .in("file_id", fileIds);

      // Filter files: show unrestricted OR files where guest has explicit permission
      accessibleFiles = (files || []).filter(file => {
        if (!file.is_restricted) return true;
        // For restricted files, check if guest uploaded it or has permission
        const permission = filePermissions?.find(p => p.file_id === file.id);
        return !!permission;
      }).map(file => {
        const permission = filePermissions?.find(p => p.file_id === file.id);
        return {
          ...file,
          permission_level: permission?.permission_level || "view",
          is_own_upload: false // Guests can't be uploaders in the traditional sense
        };
      });
    }

    // Build breadcrumbs
    const breadcrumbs: { id: string; name: string }[] = [];
    let currentFolderId = folderId;
    
    while (currentFolderId) {
      const { data: folder } = await supabaseAdmin
        .from("data_room_folders")
        .select("id, name, parent_id")
        .eq("id", currentFolderId)
        .single();
      
      if (folder) {
        breadcrumbs.unshift({ id: folder.id, name: folder.name });
        currentFolderId = folder.parent_id;
      } else {
        break;
      }
    }

    // Log access activity
    await supabaseAdmin.from("data_room_activity").insert({
      data_room_id: dataRoom.id,
      organization_id: dataRoom.organization_id,
      user_name: invite.guest_name || email.split("@")[0],
      user_email: email.toLowerCase(),
      action: folderId ? "folder_viewed" : "data_room_accessed",
      is_guest: true,
      details: folderId ? { folder_id: folderId } : null
    });

    return new Response(
      JSON.stringify({
        dataRoom: {
          id: dataRoom.id,
          name: dataRoom.name,
          description: dataRoom.description,
          organizationName: (dataRoom.organization as any)?.name || "",
          organizationId: dataRoom.organization_id,
        },
        guestName: invite.guest_name,
        folders: folders || [],
        files: accessibleFiles,
        breadcrumbs,
        currentFolderId: folderId || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-guest-data-room-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
