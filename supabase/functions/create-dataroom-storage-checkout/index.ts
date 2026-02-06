import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Storage tier pricing for Data Rooms (in USD cents)
const STORAGE_TIERS: Record<string, { mb: number; priceUsd: number; label: string }> = {
  "100mb": { mb: 100, priceUsd: 999, label: "100 MB" },    // $9.99/mo
  "500mb": { mb: 500, priceUsd: 1499, label: "500 MB" },   // $14.99/mo
  "1gb": { mb: 1024, priceUsd: 2499, label: "1 GB" },      // $24.99/mo
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

    console.log("Creating dataroom storage checkout:", { tier, organizationId, userId: user.id });

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

    // Convert MB to GB for storage (used in metadata)
    const storageGb = tierInfo.mb / 1024;

    // Create checkout session for one-time storage purchase in USD
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Data Room Storage - ${tierInfo.label}`,
              description: `One-time purchase of ${tierInfo.label} additional storage for Data Rooms`,
            },
            unit_amount: tierInfo.priceUsd,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&storage_purchase=success&product=dataroom&org_id=${organizationId}&org_slug=${orgData.slug}`,
      cancel_url: `${origin}/${orgData.slug}/dataroom?storage_purchase=canceled`,
      metadata: {
        type: "storage_purchase",
        product: "dataroom",
        organizationId,
        userId: user.id,
        storageMb: tierInfo.mb.toString(),
        storageGb: storageGb.toString(),
      },
    });

    console.log("Dataroom storage checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error creating dataroom storage checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
