import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STORAGE-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Parse request body
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    logStep("Got session ID", { sessionId });

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
    logStep("Retrieved Stripe session", { 
      status: session.status,
      payment_status: session.payment_status, 
      metadata: session.metadata 
    });

    // Check if subscription is active
    const subscription = session.subscription as Stripe.Subscription | null;
    if (session.status !== "complete" || !subscription) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Subscription not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the user matches
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    const organizationId = session.metadata?.organization_id;
    const storageGb = parseFloat(session.metadata?.storage_gb || "0");

    if (!organizationId || storageGb <= 0) {
      throw new Error("Invalid session metadata");
    }

    // Check if this session was already processed
    const { data: existingPurchase } = await supabaseAdmin
      .from("storage_purchases")
      .select("status")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingPurchase?.status === "completed") {
      logStep("Purchase already processed");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Purchase already processed",
        storageGb 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update the purchase record to completed
    await supabaseAdmin
      .from("storage_purchases")
      .update({ status: "completed" })
      .eq("stripe_session_id", sessionId);
    logStep("Updated purchase record to completed");

    // Update organization storage - upsert to handle first purchase
    const { data: currentStorage } = await supabaseAdmin
      .from("organization_storage")
      .select("additional_storage_gb")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const currentGb = currentStorage?.additional_storage_gb || 0;
    const newTotalGb = currentGb + storageGb;

    await supabaseAdmin
      .from("organization_storage")
      .upsert({
        organization_id: organizationId,
        additional_storage_gb: newTotalGb,
      }, {
        onConflict: "organization_id",
      });
    logStep("Updated organization storage", { 
      previousGb: currentGb, 
      addedGb: storageGb, 
      newTotalGb 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Storage purchase verified and applied",
      storageGb,
      newTotalGb
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
