// NOTE: The generated Supabase `Database` type is currently empty in this project,
// which makes `from("...")` calls type to `never` and blocks compilation.
// We intentionally use an untyped client for now so the app can run.
// When you regenerate Supabase types, you can re-introduce `createClient<Database>`.
import { createClient } from "@supabase/supabase-js";

// Lovable/Supabase commonly expose the anon key as `VITE_SUPABASE_ANON_KEY`.
// This project previously referenced `VITE_SUPABASE_PUBLISHABLE_KEY`, which can
// be undefined in preview/build environments and cause the app to crash/hang.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Fail loudly but avoid a hard crash so the UI can still render.
  // Auth/DB calls will still fail, but the preview won't be blank.
  // eslint-disable-next-line no-console
  console.error(
    "[SUPABASE] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(SUPABASE_URL ?? "http://localhost", SUPABASE_KEY ?? "invalid", {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});