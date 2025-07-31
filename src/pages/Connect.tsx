import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePlaidLink } from 'react-plaid-link';

const Connect: React.FC = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>(''); // For demo purposes
  const [connectLoading, setConnectLoading] = useState(false);
  const [newTransactions, setNewTransactions] = useState<number>();

  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const { data, error } = await supabase.functions.invoke('create-link-token', {
        body: {
          userId: userId,
          clientName: 'Finance App'
        }
      });

      if (error) {
        throw error;
      }

      console.log("Link token response:", data);
      setLinkToken(data.data.link_token);
    } catch (err) {
      console.error("Error fetching link token:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch link token');
    } finally {
      setLoading(false);
    }
  };

  // Function to exchange token and fetch transactions
  const handleExchangeTokenAndFetch = async () => {
    if (!publicToken) {
      setError('Public token is required');
      return;
    }

    setConnectLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;

      const { data, error } = await supabase.functions.invoke('exchange-token-and-fetch-transactions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: {
          public_token: publicToken,
          user_id: userId // Should be actual user ID from session
        }
      });

      if (error) {
        throw error;
      }

      console.log("Exchange token response:", data);
      // You might want to save the item_id from the response
      if (data.data.item_id) {
        setItemId(data.data.item_id);
        setNewTransactions(data.data.new_transactions);
      }
    } catch (err) {
      console.error("Error exchanging token:", err);
      setError(err instanceof Error ? err.message : 'Failed to exchange token');
    } finally {
      setConnectLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      console.log("Plaid Link success:", { public_token, metadata });
      setPublicToken(public_token);
      setError(null);
    },
    onExit: (error, metadata) => {
      if (error) {
        console.error("Plaid Link exited with error:", error);
        setError(error.error_message || 'Plaid Link exited with error');
      } else {
        console.log("Plaid Link exited successfully", metadata);
      }
    },
    onEvent: (eventName, metadata) => {
      console.log("Plaid Link event:", eventName, metadata);
    }
  });

  const handleConnectToPlaid = () => {
    if (ready && linkToken) {
      console.log("Opening Plaid connection with token:", linkToken);
      open();
    } else {
      console.log("Plaid Link is not ready or link token is missing.");
    }
  };

  useEffect(() => {
    fetchLinkToken();
    console.log("Connect page loaded");
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Connect to Plaid</h2>
      <p>This page will handle the connection to Plaid.</p>
      
      {error && <div style={{color: 'red', marginBottom: '10px'}}>Error: {error}</div>}
      
      {/* Step 1: Get Link Token */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Step 1: Get Link Token</h3>
        {loading && <p>Loading link token...</p>}
        {linkToken && <p style={{color: 'green'}}>✓ Link token received!</p>}
        <button 
          onClick={fetchLinkToken}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh Link Token'}
        </button>
      </div>

      {/* Step 2: Connect to Plaid (simulate) */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Step 2: Connect to Plaid</h3>
        <button 
          onClick={handleConnectToPlaid}
          disabled={!linkToken || loading}
        >
          {loading ? 'Loading...' : 'Simulate Plaid Connection'}
        </button>
        {publicToken && (
          <p style={{color: 'green', fontSize: '12px'}}>
            ✓ Public token: {publicToken.substring(0, 20)}...
          </p>
        )}
      </div>

      {/* Step 3: Exchange Token and Fetch Transactions */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Step 3: Exchange Token & Fetch Transactions</h3>
        <button 
          onClick={handleExchangeTokenAndFetch}
          disabled={!publicToken || connectLoading}
        >
          {connectLoading ? 'Exchanging...' : 'Exchange Token & Fetch Transactions'}
        </button>
        {itemId && (
          <p style={{color: 'green', fontSize: '12px'}}>
            ✓ {newTransactions || 0} New Transactions
          </p>
        )}
      </div>
    </div>
  );
};

export default Connect;