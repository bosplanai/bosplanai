// NOTE: The generated Supabase `Database` type is currently empty in this project,
// which makes `from("...")` calls type to `never` and blocks compilation.
// We intentionally use an untyped client for now so the app can run.
// When you regenerate Supabase types, you can re-introduce `createClient<Database>`.
import { createClient } from "@supabase/supabase-js";

// Lovable does not reliably support `import.meta.env.VITE_*` in the frontend.
// This is a publishable (anon) key, so it's safe to keep in client-side code.
// Project: qiikjhvzlwzysbtzhdcd
export const SUPABASE_URL = "https://qiikjhvzlwzysbtzhdcd.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpaWtqaHZ6bHd6eXNidHpoZGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTk2NzMsImV4cCI6MjA4NDk5NTY3M30.pBy01M70ltLCmrxqJPkZIsqLgS-61995zhQB0Kgec58";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});