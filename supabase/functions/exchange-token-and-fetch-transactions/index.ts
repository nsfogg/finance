import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from "npm:plaid@11.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper function to wait/sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    // const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') // Add this for token encryption

    // Validate required environment variables
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Missing required Plaid credentials')
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase credentials')
    }

    // if (!ENCRYPTION_KEY) {
    //   throw new Error('Missing encryption key')
    // }

    // Parse request body
    const { public_token, user_id } = await req.json()

    if (!public_token) {
      throw new Error('Missing public_token')
    }

    if (!user_id) {
      throw new Error('Missing user_id')
    }

    // Basic input validation
    if (typeof public_token !== 'string' || typeof user_id !== 'string') {
      throw new Error('Invalid input types')
    }

    if (user_id.length > 255 || public_token.length > 1000) {
      throw new Error('Input too long')
    }

    // Configure Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
        },
      },
    })

    const plaidClient = new PlaidApi(configuration)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('Exchanging public token for access token...')

    // Step 1: Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    })

    const accessToken = tokenResponse.data.access_token
    const itemId = tokenResponse.data.item_id

    console.log('Successfully exchanged token. Item ID:', itemId)

    // Step 3: Fetch recent transactions (don't store them)
    console.log('Fetching available transactions...')

    let cursor = null
    const allTransactions = []
    let hasMore = true
    let attempts = 0
    const maxAttempts = 10 // Limit attempts to prevent infinite loops

    // Get only recent transactions for immediate display
    while (hasMore && attempts < maxAttempts) {
      attempts++
      
      const request: { access_token: string; cursor?: string } = {
        access_token: accessToken,
      }
      if (cursor !== null) {
        request.cursor = cursor
      }

      const response = await plaidClient.transactionsSync(request)
      const data = response.data

      cursor = data.next_cursor
      if (cursor === "") {
        await sleep(2000)
        continue
      }

      // Add ALL transactions
      allTransactions.push(...data.added)
      hasMore = data.has_more

      console.log(`Batch ${attempts}: Found ${data.added.length} transactions. Total so far: ${allTransactions.length}`)

      // Optional: Add a reasonable limit to prevent infinite loops
      if (allTransactions.length >= 10000) {
        console.log('Reached 10,000 transaction limit, stopping fetch')
        break
      }
    }

    console.log(`Fetched ${allTransactions.length} recent transactions`)

    // Step 4: Get existing transaction IDs from database to avoid duplicates
    console.log('Checking for existing transactions in database...')
    const existingTransactionIds = new Set()

    const { data: existingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('transaction_id')
      .eq('user_id', user_id)

    if (fetchError) {
      console.error('Error fetching existing transactions:', fetchError)
      // Continue anyway, might result in some duplicates but won't break the flow
    } else {
      (existingTransactions as { transaction_id: string }[] | null)?.forEach((tx: { transaction_id: string }) => existingTransactionIds.add(tx.transaction_id))
      console.log(`Found ${existingTransactionIds.size} existing transactions in database`)
    }

    // Step 5: Filter out transactions that already exist in database
    const newTransactions = allTransactions.filter(transaction => 
      !existingTransactionIds.has(transaction.transaction_id)
    )

    console.log(`${newTransactions.length} new transactions to store (out of ${allTransactions.length} total)`)

    // Step 6: Prepare data for database storage (only new transactions)
    const dbTransactions = newTransactions
      .map(transaction => ({
        user_id: user_id,
        item_id: itemId,
        transaction_id: transaction.transaction_id,
        account_id: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchant_name || null,
        category: transaction.personal_finance_category?.primary || 'Unknown',
        subcategory: transaction.personal_finance_category?.detailed || 'Unknown',
      }))

      // Step 7: Store only new transactions in database
if (dbTransactions.length > 0) {
  console.log(`Storing ${dbTransactions.length} new transactions...`)
  
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert(dbTransactions) // Use insert instead of upsert since we already filtered duplicates

  if (transactionError) {
    console.error('Error storing transactions:', transactionError)
    console.log('Continuing despite transaction storage error...')
  } else {
    console.log(`Successfully stored ${dbTransactions.length} new transactions`)
  }
} else {
  console.log('No new transactions to store')
}

// Step 8: Prepare response data (return recent transactions for display)
const responseTransactions = allTransactions
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 50) // Return most recent 50 for immediate display
  .map(transaction => ({
    transaction_id: transaction.transaction_id,
    account_id: transaction.account_id,
    amount: transaction.amount,
    date: transaction.date,
    name: transaction.name,
    merchant_name: transaction.merchant_name,
    category: transaction.personal_finance_category?.primary || 'Unknown',
    subcategory: transaction.personal_finance_category?.detailed || null,
  }))

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        item_id: itemId,
        transactions: responseTransactions,
        total_transactions_fetched: allTransactions.length,
        new_transactions_stored: dbTransactions.length,
        existing_transactions_skipped: allTransactions.length - newTransactions.length,
        connection_status: 'active'
      }
    }),
    {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    }
  )

  } catch (error) {
    console.error('Error in exchange token and fetch transactions:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to exchange token and fetch transactions'
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