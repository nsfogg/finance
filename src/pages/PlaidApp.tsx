import React, { useState, useEffect } from 'react';
import PlaidTransactionsClient from './PlaidTransactionsClient';
import { usePlaidLink } from 'react-plaid-link';

const PlaidLinkButton = ({ onSuccess }: { onSuccess: (token: string, metadata: any) => void }) => {
  const { open, ready } = usePlaidLink({
    token: 'your-link-token', // Get this from your backend
    onSuccess: (public_token, metadata) => {
      onSuccess(public_token, metadata);
    },
  });

interface User {
  id: string;
  email: string;
}

const PlaidApp: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  // Mock authentication - replace with your actual auth system
  useEffect(() => {
    // Simulate checking authentication state
    const mockUser: User = { 
      id: 'user-123', 
      email: 'user@example.com' 
    };
    const mockToken = 'mock-jwt-token'; // Replace with actual JWT from your auth provider
    
    setUser(mockUser);
    setSessionToken(mockToken);
  }, []);

  // Handle successful Plaid Link connection
  const handlePlaidSuccess = (public_token: string, metadata: any) => {
    console.log('Plaid Link success:', { public_token, metadata });
    
    // In a real implementation, you would:
    // 1. Send the public_token to your backend
    // 2. Exchange it for an access_token via Plaid's /link/token/exchange endpoint
    // 3. Store the access_token securely in your database
    // 4. Return some identifier to the frontend
    
    // For demo purposes, setting a placeholder token
    setAccessToken('placeholder-access-token');
  };

  const handleConnectBank = () => {
    // In a real app, this would open Plaid Link
    // For now, we'll simulate a successful connection
    console.log('Opening Plaid Link...');
    
    // Simulate successful connection after a delay
    setTimeout(() => {
      handlePlaidSuccess('public-sandbox-test-token', {
        institution: { name: 'Test Bank' },
        accounts: [{ id: 'account-1', name: 'Checking' }]
      });
    }, 1000);
  };

  const handleError = (error: string) => {
    console.error('Plaid error:', error);
    // Handle error (show toast, etc.)
  };

  const handleTransactionsLoaded = (transactions: any[]) => {
    console.log('Loaded transactions:', transactions.length);
    // Handle successful transaction load
  };

  const handleDisconnect = () => {
    setAccessToken('');
    // In a real app, you'd also revoke the access token on your backend
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Plaid Transactions Dashboard
          </h1>
          <p className="text-gray-600 mb-4">
            Securely view your financial transactions via Supabase Edge Functions
          </p>
          
          {user && (
            <div className="text-sm text-gray-500">
              Logged in as: {user.email}
            </div>
          )}
        </header>

        {!user ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading user authentication...</p>
          </div>
        ) : !accessToken ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Connect Your Bank Account
                  </h2>
                  <p className="text-gray-600">
                    Securely connect your bank account to view your transactions. 
                    Your data is protected and never stored on our servers.
                  </p>
                </div>
                
                <button
                  onClick={handleConnectBank}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Connect Bank Account
                </button>
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>🔒 Bank-level security</p>
                  <p>📱 Powered by Plaid</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-sm text-gray-500 max-w-2xl mx-auto">
              <p className="font-medium mb-2">Demo Mode:</p>
              <p>
                This demo uses placeholder data. In a real implementation, 
                clicking "Connect Bank Account" would open Plaid Link for secure 
                bank authentication.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Disconnect Bank
              </button>
            </div>
            
            <PlaidTransactionsClient 
              accessToken={accessToken}
              user={user}
              sessionToken={sessionToken}
              onError={handleError}
              onTransactionsLoaded={handleTransactionsLoaded}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaidApp;