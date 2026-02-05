 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface AddCommentRequest {
   email: string;
   token?: string;
   password?: string;
   fileId: string;
   comment: string;
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
     const { email, token, password, fileId, comment } = body as AddCommentRequest;
     const actualPassword = password || token;
 
     console.log("guest-add-file-comment called:", { email, fileId, hasPassword: !!actualPassword });
 
     if (!email || !actualPassword || !fileId || !comment) {
       return new Response(
         JSON.stringify({ error: "Email, password, fileId, and comment are required" }),
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
 
     // Get the file to verify it's in the guest's data room
     const { data: file, error: fileError } = await supabaseAdmin
       .from("data_room_files")
       .select("id, data_room_id, name")
       .eq("id", fileId)
       .is("deleted_at", null)
       .single();
 
     if (fileError || !file || file.data_room_id !== invite.data_room_id) {
       return new Response(
         JSON.stringify({ error: "File not found or access denied" }),
         { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Insert comment
     const commenterName = invite.guest_name || normalizedEmail.split("@")[0];
     const { data: newComment, error: insertError } = await supabaseAdmin
       .from("data_room_file_comments")
       .insert({
         file_id: fileId,
         data_room_id: invite.data_room_id,
         organization_id: invite.organization_id,
         commenter_name: commenterName,
         commenter_email: normalizedEmail,
         comment: comment.trim(),
         is_guest: true,
       })
       .select()
       .single();
 
     if (insertError) {
       console.error("Error inserting comment:", insertError);
       return new Response(
         JSON.stringify({ error: "Failed to add comment" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Log activity
     await supabaseAdmin.from("data_room_activity").insert({
       data_room_id: invite.data_room_id,
       organization_id: invite.organization_id,
       user_name: commenterName,
       user_email: normalizedEmail,
       action: "comment_added",
       is_guest: true,
       details: { file_id: fileId, file_name: file.name }
     });
 
     return new Response(
       JSON.stringify({ comment: newComment }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: unknown) {
     console.error("Error in guest-add-file-comment:", error);
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