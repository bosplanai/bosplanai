 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface SaveDocumentRequest {
   email: string;
   token?: string;
   password?: string;
   fileId: string;
   documentId: string;
   content: string;
   createVersion?: boolean;
   versionNote?: string;
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
     const { email, token, password, fileId, documentId, content, createVersion, versionNote } = body as SaveDocumentRequest;
     const actualPassword = password || token;
 
     console.log("guest-save-document-content called:", { email, fileId, documentId, createVersion, hasPassword: !!actualPassword });
 
     if (!email || !actualPassword || !fileId || !documentId) {
       return new Response(
         JSON.stringify({ error: "Email, password, fileId, and documentId are required" }),
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
       return new Response(
         JSON.stringify({ error: "Invalid credentials" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Verify password
     let passwordValid = false;
     const storedHash = invite.access_password;
     
     if (storedHash) {
       const passwordHash = await hashPassword(actualPassword.toUpperCase());
       passwordValid = (storedHash === passwordHash);
     }
 
     if (!passwordValid) {
       return new Response(
         JSON.stringify({ error: "Invalid password" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check expiry
     if (new Date(invite.expires_at) < new Date()) {
       return new Response(
         JSON.stringify({ error: "Your access has expired" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get the file
     const { data: file, error: fileError } = await supabaseAdmin
       .from("data_room_files")
       .select("id, name, is_restricted, data_room_id, parent_file_id")
       .eq("id", fileId)
       .is("deleted_at", null)
       .single();
 
     if (fileError || !file) {
       return new Response(
         JSON.stringify({ error: "File not found" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Verify file belongs to guest's data room
     if (file.data_room_id !== invite.data_room_id) {
       return new Response(
         JSON.stringify({ error: "You do not have access to this file" }),
         { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check restricted file permissions - guests need edit permission
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
 
       if (!permission || permission.permission_level !== "edit") {
         return new Response(
           JSON.stringify({ error: "You do not have edit access to this restricted file" }),
           { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
     }
 
     // Update document content
     const { error: updateError } = await supabaseAdmin
       .from("data_room_document_content")
       .update({
         content: content,
         updated_at: new Date().toISOString(),
       })
       .eq("id", documentId);
 
     if (updateError) {
       console.error("Error updating document:", updateError);
       return new Response(
         JSON.stringify({ error: "Failed to save document" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create version if requested
     if (createVersion) {
       // Get next version number
       const { data: latestVersion } = await supabaseAdmin
         .from("data_room_document_versions")
         .select("version_number")
         .eq("document_id", documentId)
         .order("version_number", { ascending: false })
         .limit(1)
         .maybeSingle();
 
       const nextVersion = (latestVersion?.version_number || 0) + 1;
 
       const { error: versionError } = await supabaseAdmin
         .from("data_room_document_versions")
         .insert({
           document_id: documentId,
           file_id: fileId,
           data_room_id: invite.data_room_id,
           organization_id: invite.organization_id,
           content: content,
           version_number: nextVersion,
           version_note: versionNote || `Edited by ${invite.guest_name || normalizedEmail}`,
         });
 
       if (versionError) {
         console.error("Error creating version:", versionError);
       }
     }
 
     // Log activity
     await supabaseAdmin.from("data_room_activity").insert({
       data_room_id: invite.data_room_id,
       organization_id: invite.organization_id,
       user_name: invite.guest_name || normalizedEmail.split("@")[0],
       user_email: normalizedEmail,
       action: createVersion ? "document_version_saved" : "document_edited",
       is_guest: true,
       details: { file_id: fileId, file_name: file.name }
     });
 
     return new Response(
       JSON.stringify({ success: true }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: unknown) {
     console.error("Error in guest-save-document-content:", error);
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });
 
 async function hashPassword(password: string): Promise<string> {
   const encoder = new TextEncoder();
   const data = encoder.encode(password);
   const hashBuffer = await crypto.subtle.digest("SHA-256", data);
   const hashArray = Array.from(new Uint8Array(hashBuffer));
   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
 }