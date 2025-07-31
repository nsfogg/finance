import React, { useState, useEffect } from 'react';

interface Transaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category: string[];
}

interface PlaidTransactionsClientProps {
  accessToken: string;
  user?: {
    id: string;
    email: string;
  };
  sessionToken?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  onError?: (error: string) => void;
  onTransactionsLoaded?: (transactions: Transaction[]) => void;
}

const PlaidTransactionsClient: React.FC<PlaidTransactionsClientProps> = ({
  accessToken,
  user,
  sessionToken,
  supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '',
  supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '',
  onError,
  onTransactionsLoaded
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (options?: {
    startDate?: string;
    endDate?: string;
    count?: number;
    offset?: number;
  }) => {
    if (!user || !sessionToken) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = 'Missing Supabase configuration';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/plaid-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          access_token: accessToken,
          start_date: options?.startDate,
          end_date: options?.endDate,
          count: options?.count || 50,
          offset: options?.offset || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      onTransactionsLoaded?.(data.transactions);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    fetchTransactions({
      startDate: thirtyDaysAgo,
      endDate: today,
      count: 100
    });
  };

  // Auto-fetch on component mount
  useEffect(() => {
    if (accessToken && user && sessionToken) {
      handleRefresh();
    }
  }, [accessToken, user, sessionToken]);

  if (!user) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please sign in to view your transactions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Transactions</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && transactions.length === 0 && !error && (
        <div className="text-center py-12 text-gray-500">
          No transactions found. Click refresh to load your recent transactions.
        </div>
      )}

      {transactions.length > 0 && (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.transaction_id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {transaction.merchant_name || transaction.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {transaction.category.join(', ')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {transaction.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    transaction.amount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {transaction.amount > 0 ? 'Debit' : 'Credit'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-sm text-gray-500 text-center">
        Showing {transactions.length} transactions
      </div>
    </div>
  );
};

export default PlaidTransactionsClient;