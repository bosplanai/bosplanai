import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify super admin status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { 
      _user_id: userData.user.id 
    });

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pricing } = await req.json();

    if (!pricing || !Array.isArray(pricing)) {
      return new Response(
        JSON.stringify({ error: "Missing pricing data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    
    const results = [];
    
    for (const item of pricing) {
      const { hoursPackage, priceCents } = item;

      // Get current pricing record
      const { data: currentPricing, error: fetchError } = await serviceClient
        .from("va_pricing")
        .select("*")
        .eq("hours_package", hoursPackage)
        .single();

      if (fetchError || !currentPricing) {
        results.push({ hoursPackage, error: "Package not found" });
        continue;
      }

      // Update Stripe price if we have the secret key
      let newStripePriceId = currentPricing.stripe_price_id;
      
      if (STRIPE_SECRET_KEY && priceCents !== currentPricing.price_cents) {
        try {
          // Create a new price in Stripe (prices are immutable, so we create new ones)
          const stripeResponse = await fetch("https://api.stripe.com/v1/prices", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              "unit_amount": priceCents.toString(),
              "currency": "gbp",
              "recurring[interval]": "month",
              "product_data[name]": `Virtual Assistant - ${hoursPackage} Hours/Month`,
              "product_data[metadata][hours_package]": hoursPackage.toString(),
            }),
          });

          if (stripeResponse.ok) {
            const stripePrice = await stripeResponse.json();
            newStripePriceId = stripePrice.id;
            console.log(`Created new Stripe price: ${newStripePriceId} for ${hoursPackage} hours`);
          } else {
            const stripeError = await stripeResponse.text();
            console.error("Stripe error:", stripeError);
          }
        } catch (stripeError) {
          console.error("Error creating Stripe price:", stripeError);
        }
      }

      // Update the database
      const { error: updateError } = await serviceClient
        .from("va_pricing")
        .update({
          price_cents: priceCents,
          stripe_price_id: newStripePriceId,
        })
        .eq("hours_package", hoursPackage);

      if (updateError) {
        results.push({ hoursPackage, error: updateError.message });
      } else {
        results.push({ hoursPackage, success: true, newStripePriceId });
      }
    }

    console.log("VA pricing updated:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-va-pricing:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
