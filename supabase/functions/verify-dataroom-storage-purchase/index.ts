import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("Verifying dataroom storage purchase:", { sessionId, userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    if (session.metadata?.type !== "storage_purchase" || session.metadata?.product !== "dataroom") {
      throw new Error("Invalid session type");
    }

    const organizationId = session.metadata.organizationId;
    const storageGb = parseFloat(session.metadata.storageGb || "0");
    const storageMb = parseFloat(session.metadata.storageMb || "0");

    if (!organizationId || storageGb <= 0) {
      throw new Error("Invalid session metadata");
    }

    // Check if this session has already been processed
    const { data: existingPurchase } = await supabase
      .from("dataroom_storage_purchases")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .eq("status", "completed")
      .maybeSingle();

    if (existingPurchase) {
      console.log("Purchase already processed:", sessionId);
      return new Response(
        JSON.stringify({ success: true, message: "Purchase already processed", storageGb, storageMb }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Record the purchase
    const { error: purchaseError } = await supabase.from("dataroom_storage_purchases").insert({
      organization_id: organizationId,
      user_id: user.id,
      stripe_session_id: sessionId,
      price_id: "one-time-dataroom-storage",
      storage_gb: storageGb,
      amount_cents: session.amount_total || 0,
      status: "completed",
    });

    if (purchaseError) {
      console.error("Error recording purchase:", purchaseError);
      throw new Error("Failed to record purchase");
    }

    // Update organization dataroom storage - upsert to add to existing or create new
    const { data: existingStorage } = await supabase
      .from("organization_dataroom_storage")
      .select("additional_storage_gb")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const currentStorage = existingStorage?.additional_storage_gb || 0;
    const newTotalStorage = parseFloat(currentStorage) + storageGb;

    const { error: storageError } = await supabase
      .from("organization_dataroom_storage")
      .upsert({
        organization_id: organizationId,
        additional_storage_gb: newTotalStorage,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "organization_id",
      });

    if (storageError) {
      console.error("Error updating organization dataroom storage:", storageError);
      throw new Error("Failed to update storage");
    }

    console.log("Dataroom storage purchase verified and applied:", {
      organizationId,
      addedGb: storageGb,
      newTotalGb: newTotalStorage,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Storage added successfully",
        storageGb,
        storageMb,
        totalStorageGb: newTotalStorage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error verifying dataroom storage purchase:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
