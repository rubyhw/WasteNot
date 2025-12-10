// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../env";

export function supabaseAdmin() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
