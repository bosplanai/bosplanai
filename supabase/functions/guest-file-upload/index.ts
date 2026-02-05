import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Supported file types
const SUPPORTED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  // Audio/Video
  "video/mp4",
  "audio/mpeg",
  "audio/mp3",
];

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

    // Parse FormData
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const email = formData.get("email") as string;
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string | null;

    console.log("guest-file-upload called:", { 
      email, 
      hasToken: !!token, 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      folderId 
    });

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const mimeType = file.type || "application/octet-stream";
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: `Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, DOC, XLSX, XLS, JPEG, PNG, MP4, MP3` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      console.error("Invite lookup error:", { inviteError, found: !!invite });
      return new Response(
        JSON.stringify({ error: "Invalid credentials or no access to any data room" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password using SHA-256
    let passwordValid = false;
    const storedHash = invite.access_password;
    
    if (storedHash) {
      const passwordHash = await hashPassword(token.toUpperCase());
      passwordValid = (storedHash === passwordHash);
    }

    if (!passwordValid) {
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

    // Get data room details to verify it exists
    const { data: dataRoom, error: roomError } = await supabaseAdmin
      .from("data_rooms")
      .select("id, name, created_by")
      .eq("id", invite.data_room_id)
      .single();

    if (roomError || !dataRoom) {
      return new Response(
        JSON.stringify({ error: "Data room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${invite.organization_id}/${invite.data_room_id}/${timestamp}-${sanitizedFileName}`;

    // Upload file to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("data-room-files")
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload file: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create file record in database - use data room creator as uploaded_by
    // since guests don't have a profile ID
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
        uploaded_by: dataRoom.created_by, // Use data room creator
        version: 1,
        is_restricted: false,
        assigned_guest_id: invite.id, // Mark as uploaded by this guest
      })
      .select("id, name")
      .single();

    if (fileError) {
      console.error("File record error:", fileError);
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from("data-room-files").remove([filePath]);
      return new Response(
        JSON.stringify({ error: `Failed to create file record: ${fileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabaseAdmin.from("data_room_activity").insert({
      data_room_id: invite.data_room_id,
      organization_id: invite.organization_id,
      user_name: invite.guest_name || normalizedEmail.split("@")[0],
      user_email: normalizedEmail,
      action: "file_uploaded",
      is_guest: true,
      details: { 
        file_id: fileRecord.id, 
        file_name: file.name,
        file_size: file.size,
        mime_type: mimeType
      }
    });

    console.log("File uploaded successfully:", { 
      fileId: fileRecord.id, 
      fileName: file.name,
      guestEmail: normalizedEmail 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        file: fileRecord 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in guest-file-upload:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function for SHA-256 password hash
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
