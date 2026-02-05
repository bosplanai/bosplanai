import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Build rate limit headers
function buildRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: Date,
  retryAfterSeconds: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": resetAt.toISOString(),
    "Retry-After": String(retryAfterSeconds),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Initialize rate limit headers
  let rateLimitHeaders: Record<string, string> = {};

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

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting check - look for recent failed attempts
    const windowStart = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
    const { data: recentAttempts, error: attemptsError } = await supabaseAdmin
      .from("guest_auth_attempts")
      .select("id, created_at")
      .eq("email", normalizedEmail)
      .eq("success", false)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false });

    const attemptCount = recentAttempts?.length || 0;
    const resetAt = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    const retryAfterSeconds = LOCKOUT_MINUTES * 60;

    // Build rate limit headers for all responses
    rateLimitHeaders = buildRateLimitHeaders(
      MAX_ATTEMPTS,
      MAX_ATTEMPTS - attemptCount - 1, // -1 for current attempt
      resetAt,
      retryAfterSeconds
    );

    if (!attemptsError && attemptCount >= MAX_ATTEMPTS) {
      console.log("Rate limit exceeded for email:", normalizedEmail);
      
      // Calculate actual retry time based on oldest attempt in window
      const oldestAttempt = recentAttempts?.[recentAttempts.length - 1];
      let actualRetryAfter = retryAfterSeconds;
      if (oldestAttempt) {
        const oldestTime = new Date(oldestAttempt.created_at).getTime();
        const unlockTime = oldestTime + (LOCKOUT_MINUTES * 60 * 1000);
        actualRetryAfter = Math.ceil((unlockTime - Date.now()) / 1000);
      }

      rateLimitHeaders = buildRateLimitHeaders(
        MAX_ATTEMPTS,
        0,
        new Date(Date.now() + actualRetryAfter * 1000),
        actualRetryAfter
      );

      return new Response(
        JSON.stringify({ 
          error: "Too many failed attempts. Please try again later.",
          retryAfter: actualRetryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    // Look up the invite by email (accepted only)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("data_room_invites")
      .select(
        `
        id,
        email,
        status,
        expires_at,
        data_room_id,
        organization_id,
        guest_name,
        access_password,
        nda_signed_at
      `
      )
      .ilike("email", normalizedEmail)
      .eq("status", "accepted")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      // Log failed attempt
      await logAuthAttempt(supabaseAdmin, normalizedEmail, false);
      console.error("Invite lookup error:", { inviteError, found: !!invite });
      return new Response(
        JSON.stringify({ error: "Invalid credentials or no access to any data room" }),
        { status: 401, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
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
      // Log failed attempt
      await logAuthAttempt(supabaseAdmin, normalizedEmail, false);
      console.error("Password mismatch");
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 401, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful attempt and clear failed attempts
    await logAuthAttempt(supabaseAdmin, normalizedEmail, true);

    // Update rate limit headers to show full quota after successful auth
    rateLimitHeaders = buildRateLimitHeaders(
      MAX_ATTEMPTS,
      MAX_ATTEMPTS - 1,
      resetAt,
      0
    );

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Your access has expired" }),
        { status: 401, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
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
        { status: 404, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if NDA re-signing is required (NDA updated after guest signed)
    if (dataRoom.nda_required && invite.nda_signed_at) {
      const { data: signature } = await supabaseAdmin
        .from("data_room_nda_signatures")
        .select("nda_content_hash")
        .eq("data_room_id", dataRoom.id)
        .ilike("signer_email", normalizedEmail)
        .order("signed_at", { ascending: false })
        .limit(1)
        .single();

      if (signature && dataRoom.nda_content_hash && signature.nda_content_hash !== dataRoom.nda_content_hash) {
        return new Response(
          JSON.stringify({ 
            error: "The NDA has been updated. Please re-sign to continue.",
            code: "NDA_UPDATED"
          }),
          { status: 403, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get folders in current directory
    let foldersQuery = supabaseAdmin
      .from("data_room_folders")
      .select("id, name, created_at")
      .eq("data_room_id", dataRoom.id)
      .is("deleted_at", null);
    
    // Use .is() for null, .eq() for actual values
    if (folderId) {
      foldersQuery = foldersQuery.eq("parent_id", folderId);
    } else {
      foldersQuery = foldersQuery.is("parent_id", null);
    }
    
    const { data: folders, error: foldersError } = await foldersQuery.order("name");
    
    console.log("Folders query result:", { count: folders?.length, error: foldersError, folderId });

    // Get ALL files in the data room to properly compute latest versions
    const { data: allFiles, error: filesError } = await supabaseAdmin
      .from("data_room_files")
      .select("id, name, file_path, file_size, mime_type, created_at, updated_at, folder_id, is_restricted, uploaded_by, version, parent_file_id, assigned_to, assigned_guest_id")
      .eq("data_room_id", dataRoom.id)
      .is("deleted_at", null)
      .order("version", { ascending: false });
    
    console.log("All files query result:", { count: allFiles?.length, error: filesError });
    
    // Group files by their root file (parent_file_id or self if no parent)
    const filesByRoot: Record<string, any[]> = {};
    (allFiles || []).forEach((file: any) => {
      const rootId = file.parent_file_id || file.id;
      if (!filesByRoot[rootId]) {
        filesByRoot[rootId] = [];
      }
      filesByRoot[rootId].push(file);
    });
    
    // For each file family, get the latest version (highest version number)
    const latestVersions: any[] = [];
    Object.entries(filesByRoot).forEach(([rootId, versions]) => {
      // Sort by version descending and get the latest
      versions.sort((a, b) => (b.version || 1) - (a.version || 1));
      const latestVersion = versions[0];
      const rootFile = versions.find((v: any) => !v.parent_file_id) || versions[versions.length - 1];
      
      // Use the root file's folder_id and assignment for filtering, but show latest version's content
      latestVersions.push({
        ...latestVersion,
        // Keep folder_id from root file for proper folder filtering
        folder_id: rootFile.folder_id,
        // Keep assignment from root file - assignments persist across versions
        assigned_to: rootFile.assigned_to,
        assigned_guest_id: rootFile.assigned_guest_id,
        // Track root file id for version history
        root_file_id: rootId
      });
    });
    
    // Filter by current folder
    let files: any[];
    if (folderId) {
      files = latestVersions.filter(f => f.folder_id === folderId);
    } else {
      files = latestVersions.filter(f => !f.folder_id);
    }
    
    console.log("Filtered files for folder:", { count: files.length, folderId });

    // Filter restricted files - get guest's permissions
    const fileIds = files?.map(f => f.id) || [];
    let accessibleFiles = files || [];

    if (fileIds.length > 0) {
      // For guests, check file permissions specific to this guest's invite
      const { data: guestPermissions } = await supabaseAdmin
        .from("data_room_file_permissions")
        .select("file_id, permission_level")
        .eq("guest_invite_id", invite.id)
        .in("file_id", fileIds);

      // Filter files: show unrestricted files OR restricted files where guest has explicit permission
      accessibleFiles = (files || []).filter(file => {
        // Unrestricted files are visible to all guests
        if (!file.is_restricted) return true;
        // Restricted files require explicit guest permission
        const permission = guestPermissions?.find(p => p.file_id === file.id);
        return !!permission;
      }).map(file => {
        const guestPermission = guestPermissions?.find(p => p.file_id === file.id);
        // Unrestricted files: guests get full edit access (can view, edit, download)
        // Restricted files: use explicit permission level
        const permissionLevel = file.is_restricted 
          ? (guestPermission?.permission_level || "view")
          : "edit"; // Full access for unrestricted files
        return {
          ...file,
          permission_level: permissionLevel,
          is_own_upload: false
        };
      });
    } else {
      // No files - nothing to filter
      accessibleFiles = [];
    }

    // Get all folders in the data room (for the card display)
    const { data: allFolders } = await supabaseAdmin
      .from("data_room_folders")
      .select("id, name, created_at")
      .eq("data_room_id", dataRoom.id)
      .is("deleted_at", null)
      .order("name");

    // Fetch profile names for uploaders and assignees
    const uploaderIds = [...new Set(accessibleFiles.map(f => f.uploaded_by).filter(Boolean))];
    const assigneeIds = [...new Set(accessibleFiles.map(f => f.assigned_to).filter(Boolean))];
    const allProfileIds = [...new Set([...uploaderIds, ...assigneeIds])];
    
    // Also fetch guest assignee names
    const guestAssigneeIds = [...new Set(accessibleFiles.map((f: any) => f.assigned_guest_id).filter(Boolean))];
    
    let profileMap: Record<string, string> = {};
    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", allProfileIds);
      
      if (profiles) {
        profileMap = profiles.reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
    
    // Fetch guest names for guest assignees
    if (guestAssigneeIds.length > 0) {
      const { data: guestInvites } = await supabaseAdmin
        .from("data_room_invites")
        .select("id, guest_name, email")
        .in("id", guestAssigneeIds);
      
      if (guestInvites) {
        guestInvites.forEach((g: any) => {
          // Use invite id as key (prefixed to avoid collision with profile ids)
          profileMap[g.id] = g.guest_name || g.email;
        });
      }
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
      user_name: invite.guest_name || normalizedEmail.split("@")[0],
      user_email: normalizedEmail,
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
        profileMap,
        allFolders: allFolders || [],
      }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-guest-data-room-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } }
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

// Helper function to log authentication attempts
async function logAuthAttempt(supabaseAdmin: any, email: string, success: boolean) {
  try {
    await supabaseAdmin
      .from("guest_auth_attempts")
      .insert({ email, success });
    
    // On successful auth, clean up old failed attempts for this email
    if (success) {
      await supabaseAdmin
        .from("guest_auth_attempts")
        .delete()
        .eq("email", email)
        .eq("success", false);
    }
  } catch (error) {
    console.error("Failed to log auth attempt:", error);
    // Don't fail the request if logging fails
  }
}
