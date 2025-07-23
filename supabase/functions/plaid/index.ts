// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      status: 200
    })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  try {
    // Create Supabase client with SERVICE ROLE KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: transactions, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch transactions", details: error }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    const data = {
      message: `Fetched ${transactions?.length || 0} transactions`,
      transactions,
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        } 
      },
    )
  } catch (err) {
    console.error("Caught error in function:", err);
    return new Response(
      JSON.stringify({ error: "Function error", details: String(err) }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/plaid' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json'

*/
