import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePlaidLink } from 'react-plaid-link';
import { useNavigate } from 'react-router-dom';
import '../styles/Connect.css';

const Connect: React.FC = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [newTransactions, setNewTransactions] = useState<number>();
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
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
      setSuccess('Link token received successfully!');
    } catch (err) {
      console.error("Error fetching link token:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch link token');
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeTokenAndFetch = async () => {
    if (!publicToken) {
      setError('Public token is required');
      return;
    }

    setConnectLoading(true);
    setError(null);
    setSuccess(null);

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
          user_id: userId
        }
      });

      if (error) {
        throw error;
      }

      console.log("Exchange token response:", data);
      if (data.data.item_id) {
        setItemId(data.data.item_id);
        setNewTransactions(data.data.new_transactions_stored || 0);
        setSuccess(`Successfully connected! ${data.data.new_transactions_stored || 0} transactions imported.`);
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
      setSuccess('Bank account connected successfully!');
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
      setError(null);
      setSuccess(null);
      open();
    } else {
      console.log("Plaid Link is not ready or link token is missing.");
      setError('Plaid Link is not ready. Please refresh the link token.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFinances = () => {
    navigate('/');
  };

  const handleGoals = () => {
    navigate('/goals');
  };

  useEffect(() => {
    fetchLinkToken();
    console.log("Connect page loaded");
  }, []);

  return (
    <div className="connect-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Budget</h1>
        </div>
        <div className="navbar-actions">
          <button onClick={handleFinances} className="nav-btn">
            Finances
          </button>
          <button onClick={handleGoals} className="nav-btn">
            Goals
          </button>
          <button onClick={logout} className="nav-btn logout-btn">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <div className="connect-header">
          <h2>Connect Your Bank Account</h2>
          <p>Securely connect your bank account to start tracking your transactions and managing your budget.</p>
        </div>

        {/* Alerts */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Connection Steps */}
        <div className="steps-container">
          {/* Step 1: Get Link Token */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number">1</div>
              <div className="step-info">
                <h3>Initialize Connection</h3>
                <p>Prepare secure connection to your bank</p>
              </div>
              <div className="step-status">
                {loading && <div className="loading-spinner"></div>}
                {linkToken && !loading && <div className="status-success">✓</div>}
              </div>
            </div>
            <div className="step-content">
              <button 
                onClick={fetchLinkToken}
                disabled={loading}
                className="step-btn"
              >
                {loading ? 'Initializing...' : 'Initialize Connection'}
              </button>
            </div>
          </div>

          {/* Step 2: Connect to Plaid */}
          <div className={`step-card ${!linkToken ? 'disabled' : ''}`}>
            <div className="step-header">
              <div className="step-number">2</div>
              <div className="step-info">
                <h3>Select Your Bank</h3>
                <p>Choose and authenticate with your bank</p>
              </div>
              <div className="step-status">
                {publicToken && <div className="status-success">✓</div>}
              </div>
            </div>
            <div className="step-content">
              <button 
                onClick={handleConnectToPlaid}
                disabled={!linkToken || loading}
                className={`step-btn ${publicToken ? 'completed' : ''}`}
              >
                {publicToken ? 'Bank Connected' : 'Connect to Bank'}
              </button>
              {publicToken && (
                <div className="step-success">
                  <p>✓ Successfully connected to your bank</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Exchange Token and Fetch Transactions */}
          <div className={`step-card ${!publicToken ? 'disabled' : ''}`}>
            <div className="step-header">
              <div className="step-number">3</div>
              <div className="step-info">
                <h3>Import Transactions</h3>
                <p>Fetch and store your transaction history</p>
              </div>
              <div className="step-status">
                {connectLoading && <div className="loading-spinner"></div>}
                {itemId && !connectLoading && <div className="status-success">✓</div>}
              </div>
            </div>
            <div className="step-content">
              <button 
                onClick={handleExchangeTokenAndFetch}
                disabled={!publicToken || connectLoading}
                className={`step-btn ${itemId ? 'completed' : ''}`}
              >
                {connectLoading ? 'Importing Transactions...' : itemId ? 'Transactions Imported' : 'Import Transactions'}
              </button>
              {itemId && (
                <div className="step-success">
                  <p>✓ Imported {newTransactions || 0} transactions</p>
                  <button 
                    onClick={handleFinances}
                    className="view-transactions-btn"
                  >
                    View Transactions
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-icon">🔒</div>
          <div className="security-content">
            <h4>Your data is secure</h4>
            <p>We use bank-level encryption and never store your banking credentials. Your connection is powered by Plaid, trusted by thousands of financial apps.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connect;