import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Transaction {
  id: number;
  created_at: string;
  date: string;
  amount: number;
  name: string;
  categoryBroad: string;
  categorySpecific: string;
  confidence: string;
}

const Finance: React.FC = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      console.error("Error details:", error.message, error.details, error.hint);
      return;
    }

    setTransactions(data || []);
  }

  const callPlaidFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('plaid', {
        body: {}
      });

      if (error) {
        console.error("Error calling plaid function:", error);
      } else {
        console.log("Plaid function response:", data);
      }
    } catch (err) {
      console.error("Caught error:", err);
    }
  };

  
  const handleClick = async (e: any) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.from("transactions").insert({
        date: new Date().toISOString(),
        amount: 100,
        name: "Test Transaction",
        categoryBroad: "Broad Category",
        categorySpecific: "Specific Category"
      });
      
      if (error) {
        console.error("Error inserting transaction:", error);
        console.error("Error details:", error.message, error.details, error.hint);
      } else {
        console.log("Transaction inserted successfully:", data);
      }
    } catch (err) {
      console.error("Caught error:", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  console.log(transactions)

  const logout = async () => {
      await supabase.auth.signOut();
  }

  return (
    <div>
      <h1>Finance Page</h1>
      <button onClick={handleClick}>Click Me</button>
      <button onClick={callPlaidFunction}>Call Plaid Function</button>
      <button onClick={logout}>Sign Out</button>
      <ul>
        {transactions.map((tx) => (
          <li key={tx.id}>
            {tx.date} | {tx.amount} | {tx.categoryBroad} | {tx.categorySpecific} | {tx.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Finance;
