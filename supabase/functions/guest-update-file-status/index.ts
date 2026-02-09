import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { accessId, email, password, fileId, status } = await req.json();

    if (!accessId || !email || !password || !fileId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status value
    const validStatuses = ["not_opened", "in_review", "review_failed", "being_amended", "completed"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify guest credentials
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, email, status, access_password, data_room_id, guest_name")
      .eq("access_id", accessId)
      .eq("status", "accepted")
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid access credentials" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Invalid access credentials" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (hashedPassword !== invite.access_password) {
      return new Response(
        JSON.stringify({ error: "Invalid access credentials" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify file belongs to this data room
    const { data: file, error: fileError } = await supabaseAdmin
      .from("data_room_files")
      .select("id, data_room_id, organization_id")
      .eq("id", fileId)
      .eq("data_room_id", invite.data_room_id)
      .single();

    if (fileError || !file) {
      return new Response(
        JSON.stringify({ error: "File not found in this data room" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update file status
    const { error: updateError } = await supabaseAdmin
      .from("data_room_files")
      .update({ status })
      .eq("id", fileId);

    if (updateError) {
      console.error("Error updating file status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update file status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await supabaseAdmin.from("data_room_activity").insert({
      data_room_id: invite.data_room_id,
      organization_id: file.organization_id,
      user_name: invite.guest_name || email.split("@")[0],
      user_email: email.toLowerCase(),
      action: "file_status_changed",
      details: { file_id: fileId, new_status: status },
      is_guest: true,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in guest-update-file-status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
