import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationRequest {
  referralCode: string;
  email: string;
  password: string;
  organizationName: string;
  employeeSize: string;
  fullName: string;
  jobRole: string;
  phoneNumber: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: RegistrationRequest = await req.json();
    const { referralCode, email, password, organizationName, employeeSize, fullName, jobRole, phoneNumber } = body;

    // Validate required fields
    if (!referralCode || !email || !password || !organizationName || !fullName || !jobRole || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate referral code
    const { data: validationResult, error: validationError } = await adminClient.rpc("validate_referral_code", {
      code: referralCode,
    });

    if (validationError) {
      console.error("Validation error:", validationError);
      return new Response(
        JSON.stringify({ error: "Failed to validate referral code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = Array.isArray(validationResult) ? validationResult[0] : validationResult;
    
    if (!validation?.is_valid) {
      return new Response(
        JSON.stringify({ error: validation?.error_message || "Invalid referral code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      // Check if they already have a profile
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "This email is already registered with an organization" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // User exists but no profile - use existing user (they may have failed registration before)
      userId = existingUser.id;

      // Update their password and confirm email
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });

      if (updateError) {
        console.error("User update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user with email pre-confirmed
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
      });

      if (createError || !newUser?.user) {
        console.error("User creation error:", createError);
        return new Response(
          JSON.stringify({ error: createError?.message || "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
    }

    // Complete specialist signup using the RPC
    const { data: signupResult, error: signupError } = await adminClient.rpc("complete_specialist_signup", {
      _user_id: userId,
      _referral_code: referralCode,
      _org_name: organizationName.trim(),
      _employee_size: employeeSize,
      _full_name: fullName.trim(),
      _job_role: jobRole.trim(),
      _phone_number: phoneNumber.trim(),
    });

    const result = signupResult as { success: boolean; error?: string; organization_id?: string; plan_name?: string; expires_at?: string } | null;

    if (signupError || !result?.success) {
      console.error("Signup RPC error:", signupError || result?.error);
      return new Response(
        JSON.stringify({ error: result?.error || signupError?.message || "Failed to complete registration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Specialist registration complete:", {
      userId,
      organizationId: result.organization_id,
      planName: result.plan_name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        organization_id: result.organization_id,
        plan_name: result.plan_name,
        expires_at: result.expires_at,
        message: "Registration successful",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
