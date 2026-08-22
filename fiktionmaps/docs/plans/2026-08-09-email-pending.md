# Plan: email pending

Follow-ups after Slice 1 welcome (manual admin send). Slice 1 works with the **session** Supabase client + `is_admin_profile()` RLS. Items below were deferred on purpose.

Treat this as a backlog note, not current system truth. When an item ships, move durable decisions into `docs/reference/` and trim this file.

---

## P1 — Dispatch persist with service role

**Why (original D5):** write send/batch status with `createServiceClient()` so dispatch does not depend on the admin cookie. Useful later for sync jobs, webhooks, and non-interactive senders.

**Current state:** `sendWelcomeEmailAction` injects `emailsSupabaseAdapter` (session) into `dispatchEmailBatchUseCase`. `createEmailsServiceAdapter()` still exists in `email.repository.impl.ts` but is unused.

**When to do it**

1. Add `SUPABASE_SERVICE_ROLE_KEY` to server env (never expose to the browser).
2. In `email.actions.ts`, pass `createEmailsServiceAdapter()` only to **dispatch** (queue/search/preview stay on session JWT).
3. Keep Resend / renderer wiring unchanged.

**Acceptance**

- [ ] Manual welcome still works for admin.
- [ ] Dispatch updates `email_sends` / `email_batches` without requiring the admin JWT for those writes.
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` in client bundles.

No new migration required (RLS already allows admin; service role bypasses RLS).

---

## P2 — Unsubscribe (was Slice 2)

From `2026-08-09-manual-emails.md`:

1. `EMAIL_UNSUBSCRIBE_SECRET`
2. HMAC URL in welcome footer
3. Public confirm page → `email_suppressions`
4. Queue refuses suppressed recipients

`email_suppressions` table already exists from `075`.

---

## P3 — More templates (was Slice 3)

`contribution_recap`, `new_place`, `new_city`: widen `email_type` CHECK, panel selector, same queue/dispatch path.

---

## P4 — Later (was Slice 4)

- AI draft for `customMessage`
- Resend bounce/complaint webhooks → `email_suppressions` (this is where service-role persist becomes more important)
- Real job queue instead of sync dispatch
- `locale` on profiles + EN templates
- `notification_events` / `source_event_id`
- Logged-in email preferences page

---

## Done in app (not pending)

- Admin history actions for stuck rows: **Resend** (`queued` / `failed`) and **Delete** (`queued` / `failed` / `skipped`). Requires migration `076_email_sends_delete_grant.sql`.
- Temporary admin checkbox **Ignore** (`ignoreAlreadySent`): bypasses RPC idempotency by inserting `email_batches` / `email_sends` directly (session + admin RLS). No migration. Remove later if undesired in production.

---

## Notes

- `EMAIL_FROM`: required outside development; `onboarding@resend.dev` fallback only in development. Production needs a domain verified in Resend — you cannot spoof arbitrary addresses (e.g. personal Gmail) as From.
- Staging allowlist: optional `EMAIL_ALLOWED_RECIPIENTS`.
