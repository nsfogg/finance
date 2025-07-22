import { createClient } from "@supabase/supabase-js";

const databaseUrl = import.meta.env.VITE_SUPABASE_URL;
const databaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!databaseUrl || !databaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key in environment variables.");
}

export const supabase = createClient(
  databaseUrl,
  databaseAnonKey
);