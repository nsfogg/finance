import { createClient } from "@supabase/supabase-js";

const databaseUrl = import.meta.env.VITE_SUPABASE_URL;
const databaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase URL:', databaseUrl);
console.log('Supabase Anon Key (first 10 chars):', databaseAnonKey?.substring(0, 10));

if (!databaseUrl || !databaseAnonKey) {
  console.error('Environment variables:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  });
  throw new Error("Missing Supabase URL or Anon Key in environment variables.");
}

export const supabase = createClient(
  databaseUrl,
  databaseAnonKey
);