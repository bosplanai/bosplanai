import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GetVersionsRequest {
  email: string;
  password: string;
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
    const { email, password, fileId } = body as GetVersionsRequest;
    const actualPassword = password || body.token;

    console.log("guest-get-file-versions called:", { email, fileId });

    if (!email || !actualPassword || !fileId) {
      return new Response(
        JSON.stringify({ error: "Email, password, and fileId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify guest access by looking up the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select("id, email, status, data_room_id, organization_id")
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
    const storedHash = (await supabaseAdmin
      .from("data_room_invites")
      .select("access_password")
      .eq("id", invite.id)
      .single()
    ).data?.access_password;

    if (storedHash) {
      const passwordHash = await hashPassword(actualPassword.toUpperCase());
      if (storedHash !== passwordHash) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get the requested file
    const { data: file, error: fileError } = await supabaseAdmin
      .from("data_room_files")
      .select("id, name, data_room_id, parent_file_id")
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
        JSON.stringify({ error: "Access denied to this file" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the root file ID
    const rootFileId = file.parent_file_id || file.id;

    // Get all versions of this file (root file + all versions with parent_file_id pointing to root)
    const { data: versions, error: versionsError } = await supabaseAdmin
      .from("data_room_files")
      .select("id, name, version, file_path, file_size, mime_type, uploaded_by, created_at, parent_file_id")
      .eq("data_room_id", invite.data_room_id)
      .is("deleted_at", null)
      .or(`id.eq.${rootFileId},parent_file_id.eq.${rootFileId}`)
      .order("version", { ascending: false });

    if (versionsError) {
      console.error("Error fetching versions:", versionsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch versions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile names for uploaders
    const uploaderIds = [...new Set((versions || []).map(v => v.uploaded_by).filter(Boolean))];
    let profileMap: Record<string, string> = {};

    if (uploaderIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", uploaderIds);

      if (profiles) {
        profileMap = profiles.reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    return new Response(
      JSON.stringify({
        versions: versions || [],
        profileMap,
        rootFileId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in guest-get-file-versions:", error);
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
