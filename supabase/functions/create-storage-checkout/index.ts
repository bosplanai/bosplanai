import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Storage tier pricing for Bosdrive (in USD cents)
const STORAGE_TIERS: Record<string, { gb: number; priceUsd: number; label: string }> = {
  "1gb": { gb: 1, priceUsd: 149, label: "1 GB" },        // $1.49/mo
  "10gb": { gb: 10, priceUsd: 999, label: "10 GB" },     // $9.99/mo
  "100gb": { gb: 100, priceUsd: 9900, label: "100 GB" }, // $99/mo
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { tier, organizationId, returnOrigin } = await req.json();

    console.log("Creating storage checkout:", { tier, organizationId, userId: user.id });

    if (!tier || !STORAGE_TIERS[tier]) {
      throw new Error("Invalid storage tier");
    }

    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    const tierInfo = STORAGE_TIERS[tier];
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get organization details for the slug
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", organizationId)
      .single();

    if (orgError || !orgData) {
      throw new Error("Organization not found");
    }

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string | undefined;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    const origin = returnOrigin || "https://bosplanv4.lovable.app";

    // Create checkout session for monthly recurring storage subscription in USD
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Bosdrive Storage - ${tierInfo.label}`,
              description: `Monthly subscription for ${tierInfo.label} additional storage for Bosdrive`,
            },
            unit_amount: tierInfo.priceUsd,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&storage_purchase=success&product=drive&org_id=${organizationId}&org_slug=${orgData.slug}`,
      cancel_url: `${origin}/${orgData.slug}/drive?storage_purchase=canceled`,
      subscription_data: {
        metadata: {
          type: "storage_subscription",
          product: "drive",
          organizationId,
          userId: user.id,
          storageGb: tierInfo.gb.toString(),
        },
      },
      metadata: {
        type: "storage_subscription",
        product: "drive",
        organizationId,
        userId: user.id,
        storageGb: tierInfo.gb.toString(),
      },
    });

    console.log("Storage checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error creating storage checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
