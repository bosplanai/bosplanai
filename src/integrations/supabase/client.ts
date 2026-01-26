// NOTE: The generated Supabase `Database` type is currently empty in this project,
// which makes `from("...")` calls type to `never` and blocks compilation.
// We intentionally use an untyped client for now so the app can run.
// When you regenerate Supabase types, you can re-introduce `createClient<Database>`.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});