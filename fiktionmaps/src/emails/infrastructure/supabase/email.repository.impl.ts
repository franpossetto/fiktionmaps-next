import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Database, Json } from "@/supabase/database.types"
import type {
  EmailBatch,
  EmailSend,
  EmailSendWithBatch,
  WelcomeTemplateProps,
} from "@/src/emails/domain/email.entity"
import type {
  EmailsRepositoryPort,
  QueueEmailBatchInput,
} from "@/src/emails/domain/email.repository"

type GetSupabase = () => Promise<SupabaseClient<Database>> | SupabaseClient<Database>

async function queueBatchDirect(
  supabase: SupabaseClient<Database>,
  input: QueueEmailBatchInput,
  recipient: { userId: string; emailTo: string; nameTo: string },
): Promise<string> {
  const dryRun = input.dryRun
  const { data: batch, error: batchError } = await supabase
    .from("email_batches")
    .insert({
      email_type: input.emailType,
      subject: input.subject,
      custom_message: input.customMessage,
      template_props: input.templateProps as unknown as Json,
      created_by: input.createdBy,
      source: input.source,
      status: "queued",
      dry_run: dryRun,
    })
    .select("id")
    .single()

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Failed to create email batch")
  }

  const { error: sendError } = await supabase.from("email_sends").insert({
    batch_id: batch.id,
    user_id: recipient.userId,
    email_type: input.emailType,
    email_to: recipient.emailTo,
    name_to: recipient.nameTo,
    status: dryRun ? "skipped" : "queued",
    error: dryRun ? "dry_run" : null,
  })

  if (sendError) {
    await supabase.from("email_batches").delete().eq("id", batch.id)
    throw new Error(sendError.message)
  }

  return batch.id
}

function asTemplateProps(value: Json): WelcomeTemplateProps {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      name: "",
      customMessage: "",
      profileHref: "",
      mapHref: "",
      unsubscribeUrl: null,
    }
  }
  const row = value as Record<string, unknown>
  const legacyCta = typeof row.ctaHref === "string" ? row.ctaHref : ""
  return {
    name: typeof row.name === "string" ? row.name : "",
    customMessage: typeof row.customMessage === "string" ? row.customMessage : "",
    profileHref: typeof row.profileHref === "string" ? row.profileHref : "",
    mapHref: typeof row.mapHref === "string" ? row.mapHref : legacyCta,
    unsubscribeUrl:
      typeof row.unsubscribeUrl === "string" || row.unsubscribeUrl === null
        ? (row.unsubscribeUrl as string | null)
        : null,
  }
}

function mapBatch(row: Database["public"]["Tables"]["email_batches"]["Row"]): EmailBatch {
  return {
    id: row.id,
    emailType: row.email_type as EmailBatch["emailType"],
    subject: row.subject,
    customMessage: row.custom_message,
    templateProps: asTemplateProps(row.template_props),
    createdBy: row.created_by,
    source: row.source as EmailBatch["source"],
    status: row.status as EmailBatch["status"],
    dryRun: row.dry_run,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSend(row: Database["public"]["Tables"]["email_sends"]["Row"]): EmailSend {
  return {
    id: row.id,
    batchId: row.batch_id,
    userId: row.user_id,
    emailType: row.email_type as EmailSend["emailType"],
    emailTo: row.email_to,
    nameTo: row.name_to,
    status: row.status as EmailSend["status"],
    error: row.error,
    attempts: row.attempts,
    resendMessageId: row.resend_message_id,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }
}

export function createEmailsSupabaseAdapter(getSupabase: GetSupabase): EmailsRepositoryPort {
  async function client() {
    return await getSupabase()
  }

  return {
    async queueBatch(input: QueueEmailBatchInput): Promise<string> {
      const supabase = await client()
      const recipient = input.recipients[0]
      if (!recipient) {
        throw new Error("exactly one recipient required")
      }

      // Testing escape hatch: bypass RPC idempotency (no migration / no new email_type).
      if (input.allowDuplicate) {
        return queueBatchDirect(supabase, input, recipient)
      }

      const { data, error } = await supabase.rpc("queue_email_batch", {
        p_email_type: input.emailType,
        p_subject: input.subject,
        p_custom_message: input.customMessage,
        p_template_props: input.templateProps as unknown as Json,
        p_created_by: input.createdBy,
        p_source: input.source,
        p_dry_run: input.dryRun,
        p_recipients: input.recipients.map((r) => ({
          user_id: r.userId,
          email_to: r.emailTo,
          name_to: r.nameTo,
        })) as unknown as Json,
      })

      if (error) {
        if (error.message.includes("welcome already sent")) {
          throw new Error("Welcome email already sent to this user")
        }
        if (error.message.toLowerCase().includes("forbidden")) {
          throw new Error("Unauthorized")
        }
        throw new Error(error.message)
      }
      if (!data) throw new Error("Failed to queue email batch")
      return data
    },

    async getBatch(batchId: string): Promise<EmailBatch | null> {
      const supabase = await client()
      const { data, error } = await supabase
        .from("email_batches")
        .select("*")
        .eq("id", batchId)
        .maybeSingle()
      if (error || !data) return null
      return mapBatch(data)
    },

    async getSendById(sendId: string): Promise<EmailSend | null> {
      const supabase = await client()
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .eq("id", sendId)
        .maybeSingle()
      if (error || !data) return null
      return mapSend(data)
    },

    async listSendsForBatch(batchId: string): Promise<EmailSend[]> {
      const supabase = await client()
      const { data, error } = await supabase
        .from("email_sends")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true })
      if (error || !data) return []
      return data.map(mapSend)
    },

    async markBatchDispatching(batchId: string): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_batches")
        .update({ status: "dispatching" })
        .eq("id", batchId)
      if (error) throw new Error(error.message)
    },

    async markBatchDone(batchId: string): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_batches")
        .update({ status: "done" })
        .eq("id", batchId)
      if (error) throw new Error(error.message)
    },

    async markBatchFailed(batchId: string): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_batches")
        .update({ status: "failed" })
        .eq("id", batchId)
      if (error) throw new Error(error.message)
    },

    async markBatchQueued(batchId: string): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_batches")
        .update({ status: "queued" })
        .eq("id", batchId)
      if (error) throw new Error(error.message)
    },

    async markSendQueued(sendId: string): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_sends")
        .update({
          status: "queued",
          error: null,
          resend_message_id: null,
          sent_at: null,
        })
        .eq("id", sendId)
      if (error) throw new Error(error.message)
    },

    async deleteBatch(batchId: string): Promise<void> {
      const supabase = await client()
      const { error } = await supabase.from("email_batches").delete().eq("id", batchId)
      if (error) throw new Error(error.message)
    },

    async markSendSent(input): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_sends")
        .update({
          status: "sent",
          error: null,
          resend_message_id: input.resendMessageId,
          sent_at: input.sentAt,
          attempts: 1,
        })
        .eq("id", input.sendId)
      if (error) throw new Error(error.message)
    },

    async markSendFailed(input): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_sends")
        .update({
          status: "failed",
          error: input.error,
          attempts: 1,
        })
        .eq("id", input.sendId)
      if (error) throw new Error(error.message)
    },

    async markSendSkipped(input): Promise<void> {
      const supabase = await client()
      const { error } = await supabase
        .from("email_sends")
        .update({
          status: "skipped",
          error: input.error,
        })
        .eq("id", input.sendId)
      if (error) throw new Error(error.message)
    },

    async listRecentSends(limit: number): Promise<EmailSendWithBatch[]> {
      const supabase = await client()
      const { data, error } = await supabase
        .from("email_sends")
        .select(
          "id, batch_id, user_id, email_type, email_to, name_to, status, error, attempts, resend_message_id, sent_at, created_at, email_batches!inner(subject, dry_run, source)",
        )
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error || !data) return []

      return data.map((row) => {
        const batch = Array.isArray(row.email_batches) ? row.email_batches[0] : row.email_batches
        return {
          ...mapSend({
            id: row.id,
            batch_id: row.batch_id,
            user_id: row.user_id,
            email_type: row.email_type,
            email_to: row.email_to,
            name_to: row.name_to,
            status: row.status,
            error: row.error,
            attempts: row.attempts,
            resend_message_id: row.resend_message_id,
            sent_at: row.sent_at,
            created_at: row.created_at,
          }),
          subject: batch?.subject ?? "",
          dryRun: Boolean(batch?.dry_run),
          source: (batch?.source ?? "manual") as EmailSendWithBatch["source"],
        }
      })
    },
  }
}

/** Session-scoped adapter (admin JWT + RLS). */
export const emailsSupabaseAdapter = createEmailsSupabaseAdapter(createClient)

/** Service-role adapter for dispatch persistence (bypasses RLS). */
export function createEmailsServiceAdapter(): EmailsRepositoryPort {
  return createEmailsSupabaseAdapter(() => createServiceClient())
}
