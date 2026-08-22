import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import type { EmailRecipient, EmailRecipientFilter } from "@/src/emails/domain/email.entity"
import type { EmailUserDirectoryPort } from "@/src/emails/domain/email.repository"

type GetSupabase = () => Promise<SupabaseClient<Database>>

export function createEmailDirectoryAdapter(getSupabase: GetSupabase): EmailUserDirectoryPort {
  return {
    async search(query: string, filter: EmailRecipientFilter): Promise<EmailRecipient[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase.rpc("admin_search_email_recipients", {
        q: query,
        filter,
      })
      if (error) {
        if (error.message.toLowerCase().includes("forbidden")) {
          throw new Error("Unauthorized")
        }
        throw new Error(error.message)
      }
      return (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        username: row.username,
        fullName: row.full_name,
        createdAt: row.created_at,
      }))
    },

    async resolve(ids: string[]): Promise<EmailRecipient[]> {
      if (ids.length === 0) return []
      const supabase = await getSupabase()
      const { data, error } = await supabase.rpc("admin_resolve_email_recipients", {
        ids,
      })
      if (error) {
        if (error.message.toLowerCase().includes("forbidden")) {
          throw new Error("Unauthorized")
        }
        throw new Error(error.message)
      }
      return (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        username: row.username,
        fullName: row.full_name,
      }))
    },
  }
}

export const emailDirectoryAdapter = createEmailDirectoryAdapter(createClient)
