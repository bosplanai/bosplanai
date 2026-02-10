import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper function for SHA-256 password hash
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    const body = await req.json();
    const { email, fileId, status, assigned_to, assigned_guest_id } = body;
    // Support both token and password fields, and accessId as fallback password
    const actualPassword = body.token || body.password || body.accessId;

    if (!email || !actualPassword || !fileId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // At least one update field must be provided
    if (!status && assigned_to === undefined && assigned_guest_id === undefined) {
      return new Response(
        JSON.stringify({ error: "No update fields provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status value if provided
    const validStatuses = ["not_opened", "in_review", "review_failed", "being_amended", "completed"];
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify guest access - match pattern used by other guest functions
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, email, status, access_password, data_room_id, organization_id, guest_name")
      .ilike("email", normalizedEmail)
      .eq("status", "accepted")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid access credentials" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password hash
    const passwordHash = await hashPassword(actualPassword.toUpperCase());
    if (passwordHash !== invite.access_password) {
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

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (assigned_guest_id !== undefined) updateData.assigned_guest_id = assigned_guest_id;

    const { error: updateError } = await supabaseAdmin
      .from("data_room_files")
      .update(updateData)
      .eq("id", fileId);

    if (updateError) {
      console.error("Error updating file:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    const details: Record<string, unknown> = { file_id: fileId };
    if (status) details.new_status = status;
    if (assigned_to !== undefined) details.assigned_to = assigned_to;
    if (assigned_guest_id !== undefined) details.assigned_guest_id = assigned_guest_id;

    await supabaseAdmin.from("data_room_activity").insert({
      data_room_id: invite.data_room_id,
      organization_id: file.organization_id,
      user_name: invite.guest_name || normalizedEmail.split("@")[0],
      user_email: normalizedEmail,
      action: status ? "file_status_changed" : "file_assignment_changed",
      details,
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
