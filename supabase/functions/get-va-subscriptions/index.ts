import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email;

    // Get organization ID from request body
    const { organizationId } = await req.json();

    if (!organizationId) {
      throw new Error("Missing organizationId");
    }

    console.log("Fetching VA data for organization:", organizationId);

    // 1. Get VA subscriptions from Stripe
    // Search ALL customers with this email (user may have multiple - GBP legacy and USD new)
    const subscriptions: any[] = [];

    if (userEmail) {
      // Find ALL Stripe customers with this email
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 100,
      });

      console.log(`Found ${customers.data.length} Stripe customers for email`);

      // Check subscriptions across ALL customers
      for (const customer of customers.data) {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 100,
        });

        // Filter to VA subscriptions only (by metadata)
        for (const sub of stripeSubscriptions.data) {
          const metadata = sub.metadata || {};
          
          // Check if this is a VA subscription for this organization
          if (metadata.organization_id === organizationId && metadata.type === "va_subscription") {
            const amount = sub.items.data[0]?.price?.unit_amount || 0;
            const currency = sub.items.data[0]?.price?.currency || "usd";

            subscriptions.push({
              id: sub.id,
              status: sub.status,
              assistant_type: metadata.assistant_type || "general",
              hours: parseInt(metadata.hours_package || "0"),
              monthly_price: amount / 100,
              currency: currency.toUpperCase(),
              product_name: metadata.product_name || null,
              current_period_start: sub.current_period_start
                ? new Date(sub.current_period_start * 1000).toISOString()
                : null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end,
              canceled_at: sub.canceled_at
                ? new Date(sub.canceled_at * 1000).toISOString()
                : null,
              created: new Date(sub.created * 1000).toISOString(),
            });
          }
        }
      }
    }

    // 2. Get allocated VAs from database (virtual_assistants table)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: allocatedVAs, error: vaError } = await adminClient
      .from("virtual_assistants")
      .select("id, first_name, last_name, email, job_role, status, created_at")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (vaError) {
      console.error("Error fetching allocated VAs:", vaError);
    }

    // Transform allocated VAs for frontend
    const transformedVAs = (allocatedVAs || []).map((va) => ({
      id: va.id,
      name: `${va.first_name} ${va.last_name}`,
      email: va.email,
      job_role: va.job_role,
      status: va.status,
      created_at: va.created_at,
    }));

    console.log(`Found ${subscriptions.length} subscriptions, ${transformedVAs.length} allocated VAs`);

    return new Response(
      JSON.stringify({
        subscriptions,
        allocatedVAs: transformedVAs,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching VA subscriptions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
