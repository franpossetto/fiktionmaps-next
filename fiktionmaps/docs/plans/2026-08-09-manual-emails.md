# Plan: manual admin emails (Resend)

Admin panel `/admin/emails` to send a **welcome** email by hand. The send path (queue → render → transport → persist) is reused later for more templates and automation. Tables and code use `email_*`, not `notification_*`.

You do **not** need the whole plan before anything works. Ship in slices (below).

---

## TLNR

**Can we go in parts?** Yes. Slice 1 is a working welcome. Unsubscribe and extra templates come after you have tested a real inbox.

### Slice 1 — first welcome (usable product)

1. Domain types + ports in `src/emails/` (`EmailType = 'welcome'`).
2. Migration `075` (generate only, do not apply from the agent): `is_admin_profile()`, `email_batches`, `email_sends`, directory + queue RPCs. Include empty `email_suppressions` so Slice 2 does not need a messy ALTER — but do **not** wire the public unsubscribe page yet.
3. Welcome react-email template + shared layout/components. Footer **without** an unsubscribe link (a dead link is worse than none).
4. Use cases: search recipient, preview, queue, dispatch via Resend. Client sends `userId` only; server loads email/name from `auth.users` + `profiles`.
5. Admin UI: pick one user, optional custom message, preview, confirm, send. Log last 20 sends.
6. You apply the migration locally, set `RESEND_API_KEY` + `EMAIL_FROM`, send one welcome to yourself, confirm inbox + `email_sends.status = 'sent'`.

**Stop here and test.** Dry-run (optional toggle): full DB path, no Resend call.

### Slice 2 — unsubscribe (after Slice 1 works)

1. HMAC unsubscribe URL in the welcome footer.
2. Public page: GET shows confirm, POST writes `email_suppressions` (our Postgres table, not Resend/SendGrid).
3. Queue checks suppressions and refuses to send.
4. Resend a test: unsubscribe, try welcome again → blocked.

### Slice 3 — more templates (iterate)

Recap, new place, new city: new template files, widen `email_type` CHECK, panel selector. Same queue/dispatch. `fictionId` / `placeId` / `cityId` appear only here.

### Slice 4 — later (not required for mail to work)

AI custom-message draft, Resend bounce webhooks, real job queue, `locale` on profiles, `notification_events`.

### Rules that apply to every slice

- Admin check on **every** server action (`auth.getUser()` + `isUserAdminUseCase`), not only `/admin` layout.
- Resend SDK only in `email-transport.adapter.ts`.
- `EMAIL_FROM` required at **send** time, not at `next build`.
- Migration files only; never `db push` / migrate up from the agent.

---

## Glossary

**Why `userId`, not a typed name/email.**  
The panel does not submit “Francisco / fran@…”. It submits the profile id. The server reads email and name from the DB. That blocks sending to a made-up address or putting a fake name in the body (mistake or XSS on admin).

**`placeId` / `cityId` / `fictionId`.**  
Not used for welcome. They belong to later templates (“place X from fiction Y was added in city Z”). The admin would pick entities in autocomplete; the server resolves titles. Slice 3 only.

**Unsubscribe.**  
Footer link: “stop this kind of email”. The recipient is not logged in (they open Gmail), so the URL carries an HMAC signature. Confirm page writes a row in **our** `email_suppressions` table. Next welcome to that `user_id` is blocked. This is product state, not SendGrid/Resend’s suppression list. ESPs track bounces for domain reputation; that is Slice 4 webhooks copying into the same table.

**Dry-run.**  
Admin-only toggle: run queue + persist **without** calling Resend. Row stays `skipped` / `dry_run`. Recipients never see it. Preview = look at HTML. Dry-run = test DB/dispatch in staging without burning quota. Optional in Slice 1.

---

## 0. Decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Delivery | Incremental slices. Slice 1 = welcome E2E. Unsubscribe = Slice 2. More templates = Slice 3. |
| D2 | Client payload | `userId` + `customMessage` + optional `dryRun`. Name/email loaded on the server. |
| D3 | `is_admin_profile` | Zero args. `SECURITY DEFINER`, `auth.uid()`, `role = 'admin'`. Mirror of `is_staff_profile()`. |
| D4 | Read `auth.users` | RPCs `admin_search_email_recipients` / `admin_resolve_email_recipients` gated by `is_admin_profile()`. Not service role. |
| D5 | Dispatch writes | `createServiceClient()` in the persist adapter. Never in the browser. |
| D6 | Preview vs send | One `renderEmail`. Snapshot at queue time. |
| D7 | Unsubscribe | Slice 2. GET confirm, POST insert. HMAC without expiry. |
| D8 | Welcome idempotency | Reject if a `welcome` send already exists with `status = 'sent'` for that user. |
| D9 | Atomic queue | RPC `queue_email_batch` inserts batch + send in one transaction. Slice 1: one recipient. |
| D10 | `EMAIL_FROM` | Fail in dispatch if missing outside `development`. `onboarding@resend.dev` fallback only in `development`. |
| D11 | Dry-run | Optional. `email_batches.dry_run = true` → send `skipped`, `error = 'dry_run'`. |
| D12 | `source` | `manual` \| `system`. |
| D13 | `email_type` on sends | Denormalized + index `(user_id, email_type)`. |
| D14 | Types in DB | CHECK is `'welcome'` only. Widen in Slice 3. Suppressions also allow `'*'`. |
| D15 | Copy | Spanish. |
| D16 | Actions file | `email.actions.ts`. |
| D17 | Migrations | Generate `.sql` only. Do not apply from the agent. |
| D18 | Staging allowlist | If `EMAIL_ALLOWED_RECIPIENTS` is set, other recipients → `skipped`. If unset, no filter. |
| D19 | Suppressions table | Created in Slice 1 migration; unused until Slice 2. |
| D20 | AI draft | Slice 4 (or after Slice 1 if wanted). Not required to send mail. |

---

## 1. Repo context

| Piece | Where |
|---|---|
| Architecture | `docs/reference/architecture.md` + `.cursor/rules/fiktionmaps-architecture.mdc` |
| Admin layout | `app/[locale]/(app)/admin/layout.tsx` → `getIsUserAdmin` |
| Admin action check | `isUserAdminUseCase` (see `contribution.actions.ts`) |
| User email | `auth.users.email` (not on `profiles`) |
| Display name | `profiles.full_name` / `username` |
| LLM (Slice 4) | `lib/ai/get-llm-provider.ts` (default Claude) |
| Service role | `lib/supabase/service.ts` |
| Site URL | `getSiteUrl()` in `lib/site.ts` |
| Last migration | `074_…` → this feature starts at `075_email_manual_sends.sql` |

---

## 2. Infra (outside the repo)

- Resend account + verified domain (SPF, DKIM, DMARC).
- `.env.local`: `RESEND_API_KEY`, `EMAIL_FROM`. Slice 2 adds `EMAIL_UNSUBSCRIBE_SECRET`.
- Optional: `EMAIL_ALLOWED_RECIPIENTS` (comma-separated).

---

# Slice 1 — Welcome email E2E

## 1.0 Domain

`src/emails/domain/`: types + ports, no infra.

```ts
type EmailType = 'welcome'

type EmailActor =
  | { source: 'manual'; adminId: string }
  | { source: 'system'; eventId?: string }

const CUSTOM_MESSAGE_MAX = 1000
```

Send input: `{ userId, customMessage, dryRun? }`.

Ports: `EmailsRepositoryPort`, `EmailUserDirectoryPort`, `EmailTransportPort`, `EmailRendererPort`.

Renderer `unsubscribeUrl` is optional in Slice 1 (`string | null`). Slice 2 makes it required.

**Acceptance**

- [ ] Send DTO takes `userId`, not free-typed email/name.
- [ ] Application does not import `@/lib/supabase/server` or the Resend SDK.

## 1.1 Schema

File: `supabase/migrations/075_email_manual_sends.sql` (not applied by the agent).

### `is_admin_profile()`

Same shape as `is_staff_profile()` in `034_contributions_rls.sql`, but `role = 'admin'`. Zero args. `REVOKE ALL FROM PUBLIC`; `GRANT EXECUTE` to `anon, authenticated`.

### `email_suppressions` (created now, used in Slice 2)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK `profiles(id)` | `ON DELETE CASCADE` |
| email_type | text | CHECK `welcome` or `'*'` |
| reason | text | nullable |
| created_at | timestamptz | |

`UNIQUE (user_id, email_type)`.

### `email_batches`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email_type | text | CHECK `welcome` |
| subject | text | `NOT NULL` |
| custom_message | text | `NOT NULL`, `char_length <= 1000` |
| template_props | jsonb | snapshot (`name`, …) |
| created_by | uuid FK `profiles(id)` | `ON DELETE RESTRICT` |
| source | text | CHECK `('manual','system')` |
| status | text | CHECK `('queued','dispatching','done','failed')` |
| dry_run | boolean | `NOT NULL DEFAULT false` |
| created_at / updated_at | timestamptz | `handle_updated_at()` trigger |

### `email_sends`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| batch_id | uuid FK `email_batches(id)` | `NOT NULL` (1:1 still creates a batch) |
| user_id | uuid FK `profiles(id)` | `ON DELETE RESTRICT` |
| email_type | text | denormalized, CHECK `welcome` |
| email_to | text | snapshot |
| name_to | text | `full_name` → `username` → email local-part |
| status | text | CHECK `('queued','sent','failed','skipped')` |
| error | text | nullable |
| attempts | int | default 0 |
| resend_message_id | text | nullable |
| sent_at | timestamptz | only when `sent` |
| created_at | timestamptz | |

Indexes: `UNIQUE (batch_id, user_id)`, `(user_id, email_type)`, `(batch_id, status)`, `(created_at DESC)`.

### RLS

- `ENABLE` + `FORCE`. `GRANT SELECT, INSERT, UPDATE` to `authenticated`.
- batches / sends: ALL if `is_admin_profile()`.
- suppressions: ALL if admin; SELECT if `user_id = auth.uid()`.

### Directory RPCs

```text
admin_search_email_recipients(q text, filter text default 'all')
  → (id, email, username, full_name, created_at)

admin_resolve_email_recipients(ids uuid[])
  → (id, email, username, full_name)
```

1. `IF NOT is_admin_profile() THEN RAISE forbidden`.
2. Join `auth.users` + `profiles`. No `raw_user_meta_data`.
3. Search `LIMIT 20`; escape `ilike` wildcards.
4. `filter`: `all` | `new_7d` | `no_welcome_sent` (`new_7d` = `profiles.created_at` last 7 days UTC).
5. `GRANT EXECUTE` to `authenticated`.

### Queue RPC

```text
queue_email_batch(
  p_email_type text,
  p_subject text,
  p_custom_message text,
  p_template_props jsonb,
  p_created_by uuid,
  p_source text,
  p_dry_run boolean,
  p_recipients jsonb  -- [{user_id, email_to, name_to}]
) returns uuid
```

Requires `is_admin_profile()`. One recipient. One transaction: 1 batch + 1 send (`queued`, or `skipped` if dry-run). Fail if that user already has welcome `sent`.

**Acceptance**

- [ ] `is_admin_profile()` takes no uid.
- [ ] Every attempt leaves an `email_sends` row.
- [ ] Unique `(batch_id, user_id)`.
- [ ] FORCE RLS + GRANTs.
- [ ] Directory RPCs require admin JWT.
- [ ] `.sql` generated, not applied by the agent.

## 1.2 Welcome template

`lib/email/design-tokens.ts` — only hex values:

| Token | Value |
|---|---|
| ink | `#16243D` |
| parchment | `#EFE6D3` |
| parchmentLight | `#FBF8F1` |
| forest | `#2F6B5E` |
| brass | `#B8862F` |
| charcoal | `#2B2620` |
| borderTan | `#d8cba9` |
| routeLineNavy | `#3d5470` |
| mutedNavyText | `#8FA3B8` |

Display: `Georgia, "Times New Roman", serif`. Body: `-apple-system, "Segoe UI", Helvetica, Arial, sans-serif`. Eyebrow: 11px, uppercase, tracking 1.8px, weight 600, forest.

Inline components in `lib/email/components/`: **EmailLayout** (wordmark, tagline “Donde la ficción pisa tierra”, parchment card, LEYENDA footer — no unsubscribe yet), **PostmarkStamp**, **RouteIllustration**, **CtaButton**, **CustomMessageBlock** (`message` as React text, never raw HTML).

Template: `lib/email/templates/welcome-email.tsx`.

Resolved props: `name`, `customMessage`, `ctaHref` (`getSiteUrl()` + `/es/map`). Structure: welcome eyebrow + stamp → headline → custom block → intro → RouteIllustration (fixed brand copy, fiction → real city) → CTA “Explorar el mapa”.

`PreviewProps` for `email:dev`. Script `"email:dev": "email dev --dir lib/email/templates"`.

**Acceptance**

- [ ] No hex outside design-tokens.
- [ ] `customMessage` is not interpolated as HTML.
- [ ] Welcome renders in `npm run email:dev`.
- [ ] Footer has no unsubscribe URL.

## 1.3 Module + admin panel

```
src/emails/
├── domain/
├── application/
│   ├── render-email.usecase.ts
│   ├── queue-manual-email.usecase.ts
│   ├── dispatch-email-batch.usecase.ts
│   ├── search-email-recipients.usecase.ts
│   └── list-recent-email-sends.usecase.ts
└── infrastructure/
    ├── supabase/email.repository.impl.ts
    ├── supabase/email-directory.impl.ts
    ├── resend/email-transport.adapter.ts
    ├── render/email-renderer.adapter.ts
    └── next/email.actions.ts
        email.actions.types.ts
        email.queries.ts          # never unstable_cache PII
```

Flow:

1. Action: session + `isUserAdminUseCase` + Zod.
2. Queue: resolve recipient → snapshot `{ name }` → `queue_email_batch`. (No suppression check yet.)
3. Dispatch (service client): render → dry-run or allowlist miss → `skipped`; else Resend with idempotency key `email_send:{id}` → `sent` / `failed`. Batch `done` / `failed`.

Default subject: `¡Bienvenido a FiktionMaps, {name}!`

Panel `/admin/emails`:

1. Debounced search (max 20). Filters: all / new 7 days / no welcome sent.
2. One recipient chip.
3. `customMessage` textarea (no AI yet).
4. Preview = HTML from `previewEmailAction` (same renderer as send).
5. Optional dry-run. Always confirm before send.
6. Result: `sent` / `failed` / `skipped`.
7. Log: last 20 rows (`status`, `name_to`, `email_to`, `created_at`).

Auth on actions: same pattern as `deleteContributionAction`. No `supabase.from` in `email.actions.ts`.

**Acceptance**

- [ ] Resend SDK only in `email-transport.adapter.ts`.
- [ ] Dispatch does not use the session cookie client.
- [ ] Duplicate welcome `sent` → domain error, no second mail.
- [ ] Preview and send share the renderer.
- [ ] Non-admin: layout redirect + actions `Unauthorized`.
- [ ] Search ≤ 20.

**Manual test:** apply migration yourself → env vars → send welcome to your own address → inbox + row `sent` with `resend_message_id`.

---

# Slice 2 — Unsubscribe

After Slice 1 is verified in a real inbox.

1. `EMAIL_UNSUBSCRIBE_SECRET` in env.
2. Token: `HMAC-SHA256(secret, \`${userId}:welcome\`)`.
3. URL: `{getSiteUrl()}/es/unsubscribe?u={userId}&t=welcome&sig={hmac}`.
4. `EmailLayout` takes required `unsubscribeUrl`. Welcome footer link.
5. Public page: GET = copy + confirm button. POST = `unsubscribeEmailAction` (no login, no admin) → verify HMAC → insert `email_suppressions` via service role.
6. Queue: if suppressed (`welcome` or `'*'`), return a clear error and do not call Resend. Optionally persist `skipped` / `suppressed`.
7. GET must not write (Gmail prefetch).

**Acceptance**

- [ ] Unsub → row in `email_suppressions`.
- [ ] Second welcome to that user is blocked.
- [ ] Invalid/missing sig → no write.
- [ ] GET is read-only.

---

# Slice 3 — More templates

Same send path. Per template: react-email file, subject helper, panel fields, widen `email_type` CHECK (new migration).

| Template | Extra ids | When |
|---|---|---|
| `contribution_recap` | `userId` + server-computed 7d approved counts | after welcome is stable |
| `new_place` | `userIds[]`, `fictionId`, `placeId`, `cityId` | needs broadcast rules |
| `new_city` | `userIds[]`, `cityId`, `fictionId` | same |

Broadcast (many recipients, cap ~20–50, sync timeout) is part of this slice or a follow-up — not Slice 1.

---

# Slice 4 — Optional later

- `LLMPort.completeText()` + “Generate with AI” for `customMessage` (Spanish, 2–4 sentences, ≤ 600 chars, strip HTML).
- Resend bounce/complaint webhooks → `email_suppressions`.
- Real queue (Inngest/cron) instead of sync dispatch.
- `locale` on profiles + EN templates.
- `notification_events` + `source_event_id`.
- Logged-in email preferences page.

---

## Out of scope (all slices)

- Applying migrations from the agent.
- Moderators on this panel (`/admin` is admin-only).
- Editing or deleting send history.
- Treating Resend/SendGrid as the unsubscribe source of truth.
