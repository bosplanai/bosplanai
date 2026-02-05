 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface GetDocumentRequest {
   email: string;
   token?: string;
   password?: string;
   fileId: string;
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
     const { email, token, password, fileId } = body as GetDocumentRequest;
     const actualPassword = password || token;
 
     console.log("guest-get-document-content called:", { email, fileId, hasPassword: !!actualPassword });
 
     if (!email || !actualPassword || !fileId) {
       return new Response(
         JSON.stringify({ error: "Email, password, and fileId are required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const normalizedEmail = email.toLowerCase().trim();
 
     // Verify guest credentials
     const { data: invite, error: inviteError } = await supabaseAdmin
       .from("data_room_invites")
       .select("id, email, status, expires_at, data_room_id, organization_id, access_password")
       .ilike("email", normalizedEmail)
       .eq("status", "accepted")
       .order("expires_at", { ascending: false })
       .limit(1)
       .maybeSingle();
 
     if (inviteError || !invite) {
       console.error("Invite lookup error:", { inviteError, found: !!invite });
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
       .select("id, name, file_path, mime_type, is_restricted, data_room_id, parent_file_id")
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
 
      // Check restricted file permissions - allow both view and edit for reading content
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

        // For reading document content, we allow both "view" and "edit" permissions
        // Only fully restricted files (no permission at all) should be blocked
        if (!permission) {
          return new Response(
            JSON.stringify({ error: "You do not have access to this restricted file" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
 
     // Get or create document content
     let { data: document, error: docError } = await supabaseAdmin
       .from("data_room_document_content")
       .select("*")
       .eq("file_id", fileId)
       .maybeSingle();
 
     if (!document) {
       // Create new document content if it doesn't exist
       // First try to parse the original file
       let initialContent = "<p>Start editing this document...</p>";
       
       try {
         const parseResponse = await fetch(
           `${supabaseUrl}/functions/v1/parse-document`,
           {
             method: "POST",
             headers: {
               Authorization: `Bearer ${supabaseServiceKey}`,
               "Content-Type": "application/json",
             },
              body: JSON.stringify({
                fileId: file.id,
                filePath: file.file_path,
                mimeType: file.mime_type,
                bucket: "data-room-files",
              }),
           }
         );
 
         if (parseResponse.ok) {
           const parseResult = await parseResponse.json();
           if (parseResult.content && parseResult.content.trim() !== '') {
             initialContent = parseResult.content;
           }
         }
       } catch (parseError) {
         console.error("Error parsing document:", parseError);
       }
 
       const { data: newDoc, error: createError } = await supabaseAdmin
         .from("data_room_document_content")
         .insert({
           file_id: fileId,
           data_room_id: invite.data_room_id,
           organization_id: invite.organization_id,
           content: initialContent,
           content_type: "rich_text",
         })
         .select()
         .single();
 
       if (createError) {
         console.error("Error creating document:", createError);
         return new Response(
           JSON.stringify({ error: "Failed to create document" }),
           { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       document = newDoc;
     }
 
     return new Response(
       JSON.stringify({ document }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: unknown) {
     console.error("Error in guest-get-document-content:", error);
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