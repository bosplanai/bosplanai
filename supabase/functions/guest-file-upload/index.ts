import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const email = formData.get("email") as string;
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string | null;

    console.log("guest-file-upload called:", { email, hasToken: !!token, fileName: file?.name, fileSize: file?.size });

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify guest credentials
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, email, status, expires_at, data_room_id, organization_id, access_password, guest_name")
      .ilike("email", normalizedEmail)
      .eq("status", "accepted")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      console.error("Invite lookup error:", inviteError);
      return new Response(JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify password using SHA-256
    const storedHash = invite.access_password;
    if (storedHash) {
      const encoder = new TextEncoder();
      const data = encoder.encode(token.toUpperCase());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (storedHash !== passwordHash) {
        console.error("Password mismatch");
        return new Response(JSON.stringify({ error: "Invalid password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Your access has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get data room
    const { data: dataRoom, error: roomError } = await supabaseAdmin
      .from("data_rooms")
      .select("id, name, created_by")
      .eq("id", invite.data_room_id)
      .single();

    if (roomError || !dataRoom) {
      return new Response(JSON.stringify({ error: "Data room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enforce storage limit for data room uploads
    const { data: drFiles } = await supabaseAdmin
      .from("data_room_files")
      .select("file_size")
      .eq("organization_id", invite.organization_id)
      .is("deleted_at", null);
    const totalUsed = drFiles?.reduce((acc: number, f: any) => acc + (f.file_size || 0), 0) || 0;

    const { data: storageData } = await supabaseAdmin
      .from("organization_dataroom_storage")
      .select("additional_storage_gb")
      .eq("organization_id", invite.organization_id)
      .maybeSingle();
    const additionalGb = storageData?.additional_storage_gb || 0;
    const totalAllowed = 100 * 1024 * 1024 + additionalGb * 1024 * 1024 * 1024;

    if (totalUsed >= totalAllowed) {
      return new Response(JSON.stringify({ error: "Data room storage limit exceeded. The organization needs to purchase additional storage." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upload file to storage
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${invite.organization_id}/${invite.data_room_id}/${timestamp}-${sanitizedFileName}`;
    const mimeType = file.type || "application/octet-stream";

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("data-room-files")
      .upload(filePath, fileBuffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create file record
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("data_room_files")
      .insert({
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: mimeType,
        data_room_id: invite.data_room_id,
        organization_id: invite.organization_id,
        folder_id: folderId || null,
        uploaded_by: dataRoom.created_by,
        version: 1,
        is_restricted: false,
      })
      .select("id, name")
      .single();

    if (fileError) {
      console.error("File record error:", fileError);
      await supabaseAdmin.storage.from("data-room-files").remove([filePath]);
      return new Response(JSON.stringify({ error: `Failed to create file record: ${fileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log activity
    await supabaseAdmin.from("data_room_activity").insert({
      data_room_id: invite.data_room_id,
      organization_id: invite.organization_id,
      user_name: invite.guest_name || normalizedEmail.split("@")[0],
      user_email: normalizedEmail,
      action: "file_uploaded",
      is_guest: true,
      details: { file_id: fileRecord.id, file_name: file.name }
    });

    console.log("File uploaded successfully:", fileRecord.id);

    return new Response(JSON.stringify({ success: true, file: fileRecord }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in guest-file-upload:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
