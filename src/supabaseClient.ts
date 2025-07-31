import { createClient } from "@supabase/supabase-js";

const databaseUrl = "https://ktzlivbhwippkaaurleo.supabase.co";
const databaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0emxpdmJod2lwcGthYXVybGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMzkwOTgsImV4cCI6MjA2ODgxNTA5OH0.88W2eNOyy-tj3tzNnXxtDFYIgHgvwQLhrnmsqQyYpNA";

export const supabase = createClient(
  databaseUrl,
  databaseAnonKey
);