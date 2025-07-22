import { supabase } from './supabaseClient';

export const fetchTransactions = async () => {
  const session = await supabase.auth.getSession();
  const token = session.data?.session?.access_token;

  const res = await fetch('http://localhost:3000/transactions', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};