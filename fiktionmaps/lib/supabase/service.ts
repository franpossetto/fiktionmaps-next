import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../supabase/database.types"

/**
 * Privileged server client (bypasses RLS). Use only for trusted server jobs
 * like deriving public asset variants — never expose to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (required for privileged asset jobs). Add it to .env.local.",
    )
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
