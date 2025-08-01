import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Finance.css'; // We'll create this for styling

interface Transaction {
  id: number;
  created_at: string;
  date: string;
  amount: number;
  name: string;
  category: string;
  subcategory: string;
  transaction_id: string;
  account_id: string;
  merchant_name?: string;
}

type TabType = 'transactions' | 'budget' | 'transfer';

const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      console.error("No user found");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const handleConnect = () => {
    navigate('/connect');
  }

  const handleGoals = () => {
    // Navigate to goals page (you'll need to create this route)
    navigate('/goals');
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  const renderTransactions = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Recent Transactions</h2>
        <button onClick={fetchTransactions} disabled={loading} className="refresh-btn">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {transactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found.</p>
          <p>Connect your bank account to see your transactions.</p>
          <button onClick={handleConnect} className="connect-btn">
            Connect Bank Account
          </button>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx) => (
            <div key={tx.id} className="transaction-item">
              <div className="transaction-main">
                <div className="transaction-name">{tx.name}</div>
                <div className="transaction-merchant">{tx.merchant_name}</div>
              </div>
              <div className="transaction-details">
                <div className="transaction-category">{tx.category}</div>
                <div className="transaction-date">{new Date(tx.date).toLocaleDateString()}</div>
              </div>
              <div className={`transaction-amount ${tx.amount < 0 ? 'expense' : 'income'}`}>
                ${Math.abs(tx.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBudget = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Budget Overview</h2>
      </div>
      <div className="budget-placeholder">
        <p>Budget tracking coming soon...</p>
        <div className="budget-categories">
          <div className="budget-category">
            <h3>Food & Dining</h3>
            <div className="budget-bar">
              <div className="budget-used" style={{width: '60%'}}></div>
            </div>
            <p>$600 / $1000</p>
          </div>
          <div className="budget-category">
            <h3>Transportation</h3>
            <div className="budget-bar">
              <div className="budget-used" style={{width: '40%'}}></div>
            </div>
            <p>$200 / $500</p>
          </div>
          <div className="budget-category">
            <h3>Entertainment</h3>
            <div className="budget-bar">
              <div className="budget-used" style={{width: '80%'}}></div>
            </div>
            <p>$240 / $300</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Transfer Money</h2>
      </div>
      <div className="transfer-form">
        <div className="form-group">
          <label>From Account</label>
          <select className="form-control">
            <option>Checking Account - ****1234</option>
            <option>Savings Account - ****5678</option>
          </select>
        </div>
        <div className="form-group">
          <label>To Account</label>
          <select className="form-control">
            <option>Savings Account - ****5678</option>
            <option>Checking Account - ****1234</option>
          </select>
        </div>
        <div className="form-group">
          <label>Amount ($)</label>
          <input type="number" className="form-control" placeholder="0.00" />
        </div>
        <div className="form-group">
          <label>Note (Optional)</label>
          <input type="text" className="form-control" placeholder="Transfer note..." />
        </div>
        <button className="transfer-btn">Transfer Money</button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'transactions':
        return renderTransactions();
      case 'budget':
        return renderBudget();
      case 'transfer':
        return renderTransfer();
      default:
        return renderTransactions();
    }
  };

  return (
    <div className="finance-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Budget</h1>
        </div>
        <div className="navbar-actions">
          <button onClick={handleConnect} className="nav-btn">
            Connect
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
        {/* Tab Navigation */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`tab ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            Budget
          </button>
          <button 
            className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            Transfer
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-container">
          {renderTabContent()}
        </div>``
      </div>
    </div>
  );
};

export default Finance;

// import React, { useEffect } from 'react';
// import { supabase } from '../supabaseClient';

// interface Transaction {
//   id: number;
//   created_at: string;
//   date: string;
//   amount: number;
//   name: string;
//   categoryBroad: string;
//   categorySpecific: string;
//   confidence: string;
// }

// const Finance: React.FC = () => {
//   const [transactions, setTransactions] = React.useState<Transaction[]>([]);

//   const fetchTransactions = async () => {
//     const { data, error } = await supabase
//     .from("transactions")
//     .select("*")
//     .order("date", { ascending: false });

//     if (error) {
//       console.error("Error fetching transactions:", error);
//       console.error("Error details:", error.message, error.details, error.hint);
//       return;
//     }

//     setTransactions(data || []);
//   }

//   const callPlaidFunction = async () => {
//     try {
//       const { data, error } = await supabase.functions.invoke('plaid', {
//         body: {}
//       });

//       if (error) {
//         console.error("Error calling plaid function:", error);
//       } else {
//         console.log("Plaid function response:", data);
//       }
//     } catch (err) {
//       console.error("Caught error:", err);
//     }
//   };

  
//   const handleClick = async (e: any) => {
//     e.preventDefault();

//     try {
//       const { data, error } = await supabase.from("transactions").insert({
//         date: new Date().toISOString(),
//         amount: 100,
//         name: "Test Transaction",
//         categoryBroad: "Broad Category",
//         categorySpecific: "Specific Category"
//       });
      
//       if (error) {
//         console.error("Error inserting transaction:", error);
//         console.error("Error details:", error.message, error.details, error.hint);
//       } else {
//         console.log("Transaction inserted successfully:", data);
//       }
//     } catch (err) {
//       console.error("Caught error:", err);
//     }
//   };

//   useEffect(() => {
//     fetchTransactions();
//   }, []);

//   console.log(transactions)

//   const logout = async () => {
//       await supabase.auth.signOut();
//   }

//   return (
//     <div>
//       <h1>Finance Page</h1>
//       <button onClick={handleClick}>Click Me</button>
//       <button onClick={callPlaidFunction}>Call Plaid Function</button>
//       <button onClick={logout}>Sign Out</button>
//       <ul>
//         {transactions.map((tx) => (
//           <li key={tx.id}>
//             {tx.date} | {tx.amount} | {tx.categoryBroad} | {tx.categorySpecific} | {tx.name}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default Finance;
