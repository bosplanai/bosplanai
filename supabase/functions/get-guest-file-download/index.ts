 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface GetFileDownloadRequest {
   email: string;
   token?: string;
   password?: string;
   fileId: string;
   mode?: "download" | "preview";
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
     const { email, token, password, fileId, mode = "download" } = body as GetFileDownloadRequest;
     
     // Support both token and password field
     const actualPassword = password || token;
 
     console.log("get-guest-file-download called:", { email, fileId, mode, hasPassword: !!actualPassword });
 
     if (!email || !actualPassword || !fileId) {
       return new Response(
         JSON.stringify({ error: "Email, password, and fileId are required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const normalizedEmail = email.toLowerCase().trim();
 
     // Look up the invite by email (accepted only)
     const { data: invite, error: inviteError } = await supabaseAdmin
       .from("data_room_invites")
       .select(`
         id,
         email,
         status,
         expires_at,
         data_room_id,
         organization_id,
         access_password
       `)
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
       const passwordHash = await hashPassword(actualPassword.toUpperCase());
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
 
     // Get the file (could be a version file too)
     const { data: file, error: fileError } = await supabaseAdmin
       .from("data_room_files")
       .select("id, name, file_path, file_size, mime_type, is_restricted, data_room_id, parent_file_id")
       .eq("id", fileId)
       .is("deleted_at", null)
       .single();
 
     if (fileError || !file) {
       console.error("File not found:", fileError);
       return new Response(
         JSON.stringify({ error: "File not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Verify file belongs to the guest's data room
     if (file.data_room_id !== invite.data_room_id) {
       return new Response(
         JSON.stringify({ error: "You do not have access to this file" }),
         { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // For restricted files, check guest has explicit permission
     // Note: version files inherit restriction from parent, check both
     const rootFileId = file.parent_file_id || file.id;
     
     const { data: rootFile } = await supabaseAdmin
       .from("data_room_files")
       .select("is_restricted")
       .eq("id", rootFileId)
       .single();
 
     const isRestricted = rootFile?.is_restricted || file.is_restricted;
 
     if (isRestricted) {
       const { data: permission } = await supabaseAdmin
         .from("data_room_file_permissions")
         .select("permission_level")
         .eq("file_id", rootFileId)
         .eq("guest_invite_id", invite.id)
         .maybeSingle();
 
       if (!permission) {
         return new Response(
           JSON.stringify({ error: "You do not have access to this restricted file" }),
           { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
     }
 
     // Generate signed URL for the file
     const { data: signedData, error: signedError } = await supabaseAdmin
       .storage
       .from("dataroom-files")
       .createSignedUrl(file.file_path, 3600); // 1 hour expiry
 
     if (signedError || !signedData) {
       console.error("Error creating signed URL:", signedError);
       return new Response(
         JSON.stringify({ error: "Failed to generate download URL" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Log activity
     const { data: dataRoom } = await supabaseAdmin
       .from("data_rooms")
       .select("organization_id")
       .eq("id", invite.data_room_id)
       .single();
 
     if (dataRoom && mode === "download") {
       await supabaseAdmin.from("data_room_activity").insert({
         data_room_id: invite.data_room_id,
         organization_id: dataRoom.organization_id,
         user_name: normalizedEmail.split("@")[0],
         user_email: normalizedEmail,
         action: "file_downloaded",
         is_guest: true,
         details: { file_id: file.id, file_name: file.name }
       });
     }
 
     return new Response(
       JSON.stringify({
         downloadUrl: signedData.signedUrl,
         fileName: file.name,
         mimeType: file.mime_type,
         fileSize: file.file_size
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: unknown) {
     console.error("Error in get-guest-file-download:", error);
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