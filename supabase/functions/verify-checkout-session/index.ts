import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

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

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    console.log("Verifying checkout session:", sessionId);

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    if (!session) {
      throw new Error("Session not found");
    }

    console.log("Session retrieved:", {
      id: session.id,
      status: session.status,
      customer_email: session.customer_email,
    });

    // Extract metadata from session or subscription
    const metadata = session.metadata || {};
    const subscriptionMetadata = (session.subscription as Stripe.Subscription)?.metadata || {};

    // Merge metadata (session takes precedence)
    const combinedMetadata = { ...subscriptionMetadata, ...metadata };

    return new Response(
      JSON.stringify({
        success: true,
        email: session.customer_email || (session.customer as Stripe.Customer)?.email,
        organizationName: combinedMetadata.organizationName || "",
        employeeSize: combinedMetadata.employeeSize || "",
        fullName: combinedMetadata.fullName || "",
        jobRole: combinedMetadata.jobRole || "",
        phoneNumber: combinedMetadata.phoneNumber || "",
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        status: session.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error verifying checkout session:", error);
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
