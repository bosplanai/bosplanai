import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map of assistant type IDs to human-readable labels
const ASSISTANT_TYPE_LABELS: Record<string, string> = {
  "shopify-developer": "Shopify Developer",
  "customer-service": "Customer Service Agent",
  "sales-executive": "Sales Executive",
  "social-media": "Social Media Executive",
  "graphic-designer": "Graphic Designer",
  "book-writer": "Book Writer",
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

    // Get request body
    const { hoursPackage, assistantType } = await req.json();
    const hours = parseInt(hoursPackage);

    if (!hours || !assistantType) {
      throw new Error("Missing required fields: hoursPackage or assistantType");
    }

    console.log("Creating VA checkout:", { userId, hours, assistantType });

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Could not find user profile");
    }

    // Get pricing from database (we only need price_cents, not the old stripe_price_id)
    const { data: pricing, error: pricingError } = await supabase
      .from("va_pricing")
      .select("price_cents")
      .eq("hours_package", hours)
      .eq("is_active", true)
      .single();

    if (pricingError || !pricing) {
      throw new Error(`No active pricing found for ${hours} hours package`);
    }

    const priceCents = pricing.price_cents;
    const assistantLabel = ASSISTANT_TYPE_LABELS[assistantType] || "Virtual Assistant";

    // Build a unique product lookup key per (role + hours) so we reuse products
    const productLookupKey = `va_${assistantType}_${hours}h`;
    const productName = `${assistantLabel} - ${hours} Hours/Month`;

    // Try to find an existing product by lookup_key
    let stripeProduct: Stripe.Product | null = null;

    const existingProducts = await stripe.products.search({
      query: `metadata["lookup_key"]:"${productLookupKey}"`,
      limit: 1,
    });

    if (existingProducts.data.length > 0) {
      stripeProduct = existingProducts.data[0];
      console.log("Found existing Stripe product:", stripeProduct.id);
    } else {
      // Create a new product
      stripeProduct = await stripe.products.create({
        name: productName,
        metadata: {
          lookup_key: productLookupKey,
          assistant_type: assistantType,
          hours_package: String(hours),
        },
      });
      console.log("Created new Stripe product:", stripeProduct.id);
    }

    // Always create a new price in USD (prices are immutable; this ensures correct currency/amount)
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceCents,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        assistant_type: assistantType,
        hours_package: String(hours),
      },
    });
    console.log("Created new USD price:", stripePrice.id, "amount:", priceCents);

    // Check if customer already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string | undefined;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log("Found existing Stripe customer:", customerId);
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://bosplansupabase.lovable.app";

    // Get organization slug for redirect
    const { data: org } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", profile.organization_id)
      .single();

    const orgSlug = org?.slug || "";
    const successUrl = `${origin}/${orgSlug}/virtual-assistants?success=true`;
    const cancelUrl = `${origin}/${orgSlug}/virtual-assistants?canceled=true`;

    // Create Stripe checkout session using the newly created USD price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          user_id: userId,
          organization_id: profile.organization_id,
          assistant_type: assistantType,
          hours_package: String(hours),
          product_name: productName,
        },
      },
      metadata: {
        user_id: userId,
        organization_id: profile.organization_id,
        assistant_type: assistantType,
        hours_package: String(hours),
        type: "va_subscription",
      },
    });

    console.log("VA checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error creating VA checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
