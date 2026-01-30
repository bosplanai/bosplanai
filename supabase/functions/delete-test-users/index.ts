import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { userIds, secretKey } = await req.json();

    // Simple secret key check for one-time admin use
    if (secretKey !== 'delete-test-accounts-2025') {
      return new Response(JSON.stringify({ error: 'Invalid secret key' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: 'userIds array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    
    for (const userId of userIds) {
      console.log(`Deleting user: ${userId}`);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error(`Failed to delete ${userId}:`, error.message);
        results.push({ userId, success: false, error: error.message });
      } else {
        console.log(`Successfully deleted: ${userId}`);
        results.push({ userId, success: true });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
