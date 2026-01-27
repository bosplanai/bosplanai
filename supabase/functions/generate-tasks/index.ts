import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Get request body
    const { prompt, organization_id } = await req.json();

    if (!prompt || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing prompt or organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check AI usage limits using the database function
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First check if usage is allowed
    const { data: usageAllowed, error: checkError } = await serviceClient.rpc(
      "check_ai_usage_allowed",
      { org_id: organization_id }
    );

    if (checkError) {
      console.error("Error checking AI usage:", checkError);
    }

    if (usageAllowed === false) {
      return new Response(
        JSON.stringify({ 
          error: "AI usage limit reached. Your organization has exceeded the allowed number of AI prompts for this period." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment usage before making the API call
    const { data: incrementResult, error: incrementError } = await serviceClient.rpc(
      "increment_ai_usage",
      { org_id: organization_id }
    );

    if (incrementError) {
      console.error("Error incrementing AI usage:", incrementError);
    }

    // If increment returns false, limit was hit during the increment
    if (incrementResult === false) {
      return new Response(
        JSON.stringify({ 
          error: "AI usage limit reached. Your organization has exceeded the allowed number of AI prompts for this period." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Make the AI request
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a task generation assistant. Generate a list of actionable tasks based on the user's prompt. 
            Return the tasks as a JSON array with objects containing "title" (max 60 chars) and "description" fields.
            Be concise and specific. Generate 3-8 tasks depending on the complexity of the request.
            Example format: [{"title": "Task title", "description": "Detailed description of what needs to be done"}]`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        stream: true,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate tasks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: unknown) {
    console.error("Error in generate-tasks:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
