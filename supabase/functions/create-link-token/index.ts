import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "npm:plaid@11.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET')
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox'

    // Validate required environment variables
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Missing required Plaid credentials')
    }

    // Configure Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
          'Plaid-Version': '2020-09-14',
        },
      },
    })

    const client = new PlaidApi(configuration)

    // Parse request body to get user info (optional)
    const { userId, clientName } = await req.json().catch(() => ({
      userId: 'default-user-id',
      clientName: 'Your App Name'
    }))

    // Create link token configuration
    const configs = {
      user: {
        // This should correspond to a unique id for the current user
        client_user_id: userId || `user-${Date.now()}`,
      },
      client_name: clientName || 'Your App Name',
      products: [Products.Transactions], // You can add more products as needed
      country_codes: [CountryCode.Us], // Add more countries if needed
      language: 'en',
    }

    // Create the link token
    const createTokenResponse = await client.linkTokenCreate(configs)
    
    console.log('Link token created successfully for user:', userId)

    return new Response(
      JSON.stringify({
        success: true,
        data: createTokenResponse.data
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )

  } catch (error) {
    console.error('Error creating link token:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error && typeof error === "object" && "message" in error) ? (error as { message?: string }).message : 'Failed to create link token'
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )
  }
})