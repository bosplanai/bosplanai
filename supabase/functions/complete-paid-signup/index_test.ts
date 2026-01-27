import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// In the test runner, secrets may not be injected as env vars.
// The anon key is publishable, so we can safely fall back to hardcoded values.
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") || "https://qiikjhvzlwzysbtzhdcd.supabase.co";
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpaWtqaHZ6bHd6eXNidHpoZGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTk2NzMsImV4cCI6MjA4NDk5NTY3M30.pBy01M70ltLCmrxqJPkZIsqLgS-61995zhQB0Kgec58";

// Use a known *completed* Stripe Checkout Session ID.
// This is required to test the post-payment completion path.
const COMPLETED_SESSION_ID =
  Deno.env.get("TEST_STRIPE_COMPLETED_SESSION_ID") ||
  "cs_live_a1vA8xZLGWTBRrqJnrufwMENhub8uhaY98UwzqK9MuRL3BTP4qkkI51Egy";

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

const jsonFetch = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text(); // always consume
  const json = text ? JSON.parse(text) : null;
  return { res, json };
};

Deno.test("post-payment signup completion confirms email and allows login", async () => {
  // 1) Verify session (simulates the /auth prefill step)
  const { res: verifyRes, json: verifyJson } = await jsonFetch(
    `${FUNCTIONS_BASE}/verify-checkout-session`,
    { sessionId: COMPLETED_SESSION_ID },
  );
  assertEquals(verifyRes.status, 200);
  assert(verifyJson?.success === true);
  assert(typeof verifyJson?.email === "string" && verifyJson.email.length > 3);

  const email = verifyJson.email as string;

  // 2) Complete paid signup (creates/repairs auth user + creates org/profile)
  const password = "TestPass123!";
  const { res: completeRes, json: completeJson } = await jsonFetch(
    `${FUNCTIONS_BASE}/complete-paid-signup`,
    {
      sessionId: COMPLETED_SESSION_ID,
      password,
      organizationName: "QualityMVP",
      employeeSize: "1-10",
      fullName: "Test User",
      jobRole: "Product Manager",
      phoneNumber: "+10000000000",
    },
  );

  // `complete-paid-signup` should be idempotent for an unverified-user case.
  assertEquals(completeRes.status, 200);
  assert(completeJson?.success === true);
  assertEquals(completeJson?.email, email);

  // 3) Validate the user can now log in (no "Email not confirmed")
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: signInData, error: signInErr } =
    await supabase.auth.signInWithPassword({ email, password });
  assertEquals(signInErr, null);
  assert(signInData?.session);

  await supabase.auth.signOut();
});
