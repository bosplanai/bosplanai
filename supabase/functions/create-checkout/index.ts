import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const {
      planType,
      email,
      organizationName,
      employeeSize,
      fullName,
      jobRole,
      phoneNumber,
    } = await req.json();

    console.log("Creating checkout session for:", {
      email,
      organizationName,
      planType,
    });

    // Validate required fields
    if (!email || !organizationName || !planType) {
      throw new Error("Missing required fields: email, organizationName, or planType");
    }

    // Define pricing based on plan type
    let priceData;
    if (planType === "yearly") {
      priceData = {
        currency: "usd",
        product_data: {
          name: "BosPlan Yearly Plan",
          description: "Annual subscription - Includes 3 users, $6/month per additional user",
        },
        unit_amount: 54000, // $540/year ($45/month billed annually)
        recurring: {
          interval: "year" as const,
        },
      };
    } else {
      priceData = {
        currency: "usd",
        product_data: {
          name: "BosPlan Monthly Plan",
          description: "Monthly subscription - Includes 3 users, $6/month per additional user",
        },
        unit_amount: 6000, // $60/month
        recurring: {
          interval: "month" as const,
        },
      };
    }

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId: string | undefined;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log("Found existing customer:", customerId);
    }

    // Get the origin from the request headers for the redirect URL
    const origin = req.headers.get("origin") || "https://bosplansupabase.lovable.app";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/auth?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/welcome`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationName,
          employeeSize,
          fullName,
          jobRole,
          phoneNumber,
        },
      },
      metadata: {
        organizationName,
        employeeSize,
        fullName,
        jobRole,
        phoneNumber,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
