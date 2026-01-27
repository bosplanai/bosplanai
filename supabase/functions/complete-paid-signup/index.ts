import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  sessionId: string;
  password: string;
  organizationName: string;
  employeeSize: string;
  fullName: string;
  jobRole: string;
  phoneNumber: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not configured");
      throw new Error("Stripe is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
      throw new Error("Server configuration error");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const body = (await req.json()) as Partial<RequestBody>;
    const sessionId = body.sessionId;
    const password = body.password;

    if (!sessionId) throw new Error("Missing sessionId");
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Basic required fields (these are stored in our Stripe metadata, but we accept them
    // from the client as the user may have edited them after the redirect)
    const organizationName = (body.organizationName || "").trim();
    const employeeSize = body.employeeSize || "";
    const fullName = (body.fullName || "").trim();
    const jobRole = (body.jobRole || "").trim();
    const phoneNumber = (body.phoneNumber || "").trim();

    if (!organizationName || !employeeSize || !fullName || !jobRole || !phoneNumber) {
      throw new Error("Missing required fields");
    }

    console.log("[complete-paid-signup] Verifying Stripe session", { sessionId });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    if (!session) throw new Error("Session not found");
    if (session.status !== "complete") {
      throw new Error("Checkout session is not complete");
    }

    const customerObj = session.customer as Stripe.Customer | null;
    const email = session.customer_email || customerObj?.email || null;
    if (!email) {
      throw new Error("Could not determine customer email from checkout session");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log("[complete-paid-signup] Creating user", { email });
    const { data: created, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createUserError) {
      // Common case: user already exists
      const msg = createUserError.message || "Failed to create user";
      console.error("[complete-paid-signup] createUser error", msg);
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("registered")
      ) {
        return new Response(
          JSON.stringify({
            error: "An account with this email already exists. Please sign in instead.",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw new Error(msg);
    }

    const userId = created?.user?.id;
    if (!userId) throw new Error("User creation did not return a user id");

    console.log("[complete-paid-signup] Creating org/profile", { userId });
    const { error: rpcError } = await supabaseAdmin.rpc(
      "create_organization_and_profile",
      {
        _user_id: userId,
        _org_name: organizationName,
        _employee_size: employeeSize,
        _full_name: fullName,
        _job_role: jobRole,
        _phone_number: phoneNumber,
      },
    );

    if (rpcError) {
      console.error("[complete-paid-signup] RPC error", rpcError);
      throw new Error(rpcError.message || "Failed to create organization/profile");
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[complete-paid-signup] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});