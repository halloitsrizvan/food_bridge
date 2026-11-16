// Service-role client: server only, bypasses RLS. Used for signup and the seed script.
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export function createSupabaseAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
