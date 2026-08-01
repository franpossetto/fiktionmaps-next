# Plan: change password (Supabase Auth)

Status: implemented (D1–D6 locked). Human must allow redirect URLs in Supabase Auth dashboard.

## Goal

Let a signed-in user **change their password** via Supabase Auth, with a clear
UI entry point, server-side validation, and correct session handling.

Also close the related gap: the **forgot password** UI already exists but is a
**stub** (fake delay + success message; no email is sent). A complete password
story needs both flows.

Out of scope (v1):

- OAuth / magic-link accounts (app is email+password only today)
- Passwordless login
- Admin forcing a password reset on another user
- MFA / passkeys
- Email change (separate feature)
- “Sign out all other devices” as a dedicated control (optional note below)

---

## 0. Decisions (locked)

| # | Topic | Decision |
|---|---|---|
| D1 | Entry point (logged-in change) | **Account** section in `/settings` |
| D2 | Re-auth before change | Require **current password** → `signInWithPassword` then `updateUser({ password })` |
| D3 | Forgot / reset in same delivery | **Yes** — wire forgot + recovery screen with change-password |
| D4 | Recovery redirect | **PKCE callback** — `/{locale}/auth/callback?next=/{locale}/auth/update-password` (not hash/implicit) |
| D5 | After successful change | Stay on settings, show success, clear form; keep current session |
| D6 | Password rules | Min **8** chars + **≥1 uppercase** + **≥1 symbol** (client + server); confirm must match |

---

## 1. Discovery

### 1.1 What already exists

| Piece | Path / note |
|---|---|
| Auth stack | `lib/auth/auth.supabase.ts` → `auth.service.ts` → `lib/actions/auth/auth.actions.ts` |
| Client session | `context/auth-context.tsx` (`login` / `signup` / `signOut`) |
| Login UI | `components/auth/auth-page.tsx` — views: `login` \| `signup` \| `forgot-password` |
| Forgot UI | Present; **submit is fake** (`setTimeout` + `resetLinkSent`) — no Supabase call |
| Settings | `/settings` — sections `appearance` \| `markers` only (`settings-sections.ts`) |
| Protected routes | Middleware: `/settings` requires session |
| Supabase clients | Server cookies: `lib/supabase/server.ts`; browser: `lib/supabase/client.ts` |
| i18n | `Auth.*` strings for forgot/reset labels; no change-password copy yet |
| Auth callback | **Missing** — no `app/.../auth/callback` (or equivalent) for PKCE / recovery |

### 1.2 Gaps

1. No `supabase.auth.updateUser({ password })` anywhere.
2. No `supabase.auth.resetPasswordForEmail(...)` anywhere.
3. No route to land after the recovery email link and set a new password.
4. No Account/Security surface in Settings.
5. Forgot-password copy exists but the action is not wired.

### 1.3 Architecture constraints

Password lives in **Supabase Auth** (`auth.users`), not in a business table.

- Follow the existing **`lib/auth`** stack (service + supabase adapter + server actions).
- Do **not** invent a `src/*/application/*.usecase.ts` for Auth password ops
  (architecture use cases are for domain repos / business tables).
- Exception already documented: `createClient()` for auth session at the edge is allowed.
- Actions return UI contracts `{ success, error }` (or existing `AuthResult`), not domain Zod schemas.

### 1.4 Supabase APIs involved

| Flow | API | Notes |
|---|---|---|
| Change (logged in) | `signInWithPassword({ email, password: current })` then `updateUser({ password: next })` | Re-auth proves knowledge of current password |
| Request reset email | `resetPasswordForEmail(email, { redirectTo })` | Always return generic success to UI (anti-enumeration) |
| Open recovery link | Exchange code / establish session (`type=recovery`) | Needs callback + cookie write |
| Set password after email | `updateUser({ password })` while recovery session is active | Same API as change; UX is different screen |

Dashboard / project config (human, not agent):

- Auth → URL configuration: allow `redirectTo` origins (local + prod) and path.
- Email templates: “Reset password” link must point at the app callback URL.
- Password policy in Supabase should not be weaker than app min length (align to ≥ 8 if possible).

---

## 2. Product shape

### 2.1 Flow A — Change password (signed in)

1. User opens **Settings → Account**.
2. Sees form: current password, new password, confirm new password.
3. Client validates: non-empty, new ≥ 8, new === confirm, new ≠ current.
4. Calls server action.
5. Server: session required → re-auth with current → `updateUser({ password: new })`.
6. Success: clear fields + success message. Failure: map common Supabase errors to i18n (wrong current password, weak password, rate limit).

**Save button:** this section should **not** use the theme “Save changes” that navigates `router.back()`. Own submit on the account form (or hide the global Save when Account is active).

### 2.2 Flow B — Forgot password (signed out)

1. Login → “Forgot password?” → email field (already UI).
2. Action calls `resetPasswordForEmail` with locale-aware `redirectTo`.
3. UI always shows “check your inbox” (even if email unknown) — do not leak existence.
4. User clicks email link → hits **auth callback** → session established → redirect to **Update password** page (logged-in via recovery).
5. Form: new password + confirm (no current password).
6. `updateUser({ password })` → success → redirect to `/map` (or login if we prefer re-login; default stay signed in).

### 2.3 Screens / routes

| Route | Auth | Purpose |
|---|---|---|
| `/settings` + section `account` | Required | Change password form |
| `/login` forgot view | Public | Request reset email (wire stub) |
| `/auth/callback` | Public (exchanges code) | PKCE / recovery cookie exchange |
| `/auth/update-password` | Session required (recovery or normal) | Set new password after email link |

Alternative for update-password: keep it under `(auth)` layout like login for visual consistency (dark auth chrome) instead of app shell.

### 2.4 Entry points in chrome

- Settings nav: **Account**
- Optional later: User menu → “Account” deep-link to `#account` / section query
- Login: existing forgot link (wire only)

---

## 3. Backend

### 3.1 Types (`lib/auth/auth.types.ts`)

```ts
export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export type ResetPasswordEmailInput = {
  email: string
  /** Absolute redirect URL allowed by Supabase */ 
  redirectTo: string
}

export type UpdatePasswordInput = {
  newPassword: string
}
```

Reuse or extend `AuthResult` for consistency.

### 3.2 Supabase adapter (`lib/auth/auth.supabase.ts`)

```ts
changePassword({ currentPassword, newPassword })
requestPasswordReset({ email, redirectTo })
updatePassword({ newPassword }) // recovery or already-authed session
```

**`changePassword` algorithm:**

1. `getUser()` — no user → error.
2. Email from `user.email` — missing → error.
3. `signInWithPassword({ email, password: currentPassword })` — fail → “Current password is incorrect”.
4. `updateUser({ password: newPassword })` — fail → surface message.
5. Return success.

**`requestPasswordReset`:**

1. Validate email non-empty.
2. `resetPasswordForEmail(email, { redirectTo })`.
3. On any error: log server-side; return **generic success** to client (anti-enumeration). Optional: still return success even when Supabase errors (rate limit may need a softer message — prefer generic).

**`updatePassword`:**

1. `getUser()` — required (recovery session counts).
2. `updateUser({ password: newPassword })`.

### 3.3 Service (`lib/auth/auth.service.ts`)

- Shared validation: `newPassword.length >= 8`, trim, reject empty current when required.
- Call supabase adapter; no UI strings here (or keep English technical messages; map in action/UI via codes).

Prefer **stable error codes** from service → action → UI i18n:

| Code | When |
|---|---|
| `UNAUTHORIZED` | No session |
| `INVALID_CURRENT_PASSWORD` | Re-auth failed |
| `WEAK_PASSWORD` | Too short / Supabase rejects |
| `SAME_PASSWORD` | New equals current (optional client+server) |
| `UPDATE_FAILED` | Other Supabase error |
| `RATE_LIMITED` | If detectable |

### 3.4 Server actions (`lib/actions/auth/auth.actions.ts`)

```ts
changePasswordAction(currentPassword, newPassword)
requestPasswordResetAction(email, locale) // builds redirectTo via getSiteUrl()
updatePasswordAction(newPassword)
```

`redirectTo` construction (example):

`{siteUrl}/{locale}/auth/callback?next=/{locale}/auth/update-password`

Use existing `getSiteUrl()` (already used in middleware). Never trust client-supplied absolute redirect hosts.

### 3.5 Auth callback route

New Route Handler, e.g. `app/[locale]/auth/callback/route.ts` (or without locale if you normalize):

1. Read `code` (and `next`) from query.
2. `createClient()` + `exchangeCodeForSession(code)` (SSR package pattern).
3. Redirect to safe internal `next` only (path must start with `/` and stay on same origin paths — allowlist prefix `/auth/update-password` or same-locale app paths).
4. On failure → redirect to login with error query.

This is required for recovery emails with PKCE / `@supabase/ssr` cookie sessions.

---

## 4. Frontend

### 4.1 Settings — Account section

| Piece | Responsibility |
|---|---|
| `settings-sections.ts` | Add `"account"` to section ids |
| `ChangePasswordForm` (new client) | Fields, client validation, calls `changePasswordAction` |
| `settings-section-panels.tsx` | Render account panel |
| `settings-page.tsx` | When `account` active: hide theme Save / back-on-save; show section title/description only |

Visual language: match Settings typography and spacing; no new dashboard chrome. Form is an interaction surface (inputs + primary button), not a decorative card stack.

### 4.2 Auth — wire forgot + update-password page

| Piece | Responsibility |
|---|---|
| `auth-page.tsx` | Replace stub with `requestPasswordResetAction` |
| `UpdatePasswordPage` / form | New password + confirm; call `updatePasswordAction` |
| Route under `(auth)` | Same dark auth layout as login for continuity |

### 4.3 i18n

`messages/en.json` + `es.json`:

- Under `Settings.sections.account.*` (nav, title, description)
- Under `Settings.account` or `Auth` for form labels/errors:
  - currentPassword, newPassword, confirmPassword
  - changePassword, passwordChanged
  - errors: incorrectCurrent, mismatch, tooShort, sameAsCurrent, generic
- Forgot flow: keep existing strings; add only if callback/update-password need more

### 4.4 UX details

- `autocomplete`: `current-password` / `new-password`
- Show/hide password toggles optional v1 (nice-to-have)
- Disable submit while pending; prevent double submit
- Do not log passwords; do not put them in URLs

---

## 5. Security checklist

- [ ] Always verify session server-side before change/update.
- [ ] Require current password for logged-in change (D2).
- [ ] Validate password length server-side (never trust client alone).
- [ ] Anti-enumeration on reset email request.
- [ ] Allowlist `redirectTo` / `next` (open-redirect prevention).
- [ ] Configure Supabase redirect allowlist in dashboard.
- [ ] HTTPS in production (already via site/canonical host).
- [ ] Rate limiting: rely on Supabase; surface friendly error if hit.
- Optional follow-up: after password change, `signOut({ scope: 'others' })` if/when supported by the client version — revoke other refresh tokens.

---

## 6. Implementation steps

### Step 1 — Auth core (no UI)

1. Types + validation helpers.
2. `auth.supabase` / `auth.service` methods.
3. Server actions.
4. Manual smoke with a test user (change password; confirm login with new password).

### Step 2 — Settings Account UI

1. Section id + nav + panel + `ChangePasswordForm`.
2. i18n en/es.
3. Adjust Settings save button behavior for account section.

### Step 3 — Recovery path

1. Auth callback route + safe `next`.
2. `/auth/update-password` page + form.
3. Wire forgot-password view to `requestPasswordResetAction`.
4. Document Supabase dashboard redirect URLs for local/prod (in this plan or short reference note).

### Step 4 — Docs

When shipped: short note in `docs/reference/` (auth password flows). Mark this plan implemented or delete if fully superseded by reference.

---

## 7. Test plan

### Change password (A)

- [ ] Wrong current password → clear error; password unchanged.
- [ ] Mismatch confirm → client error; no action call (or action rejects).
- [ ] New password &lt; 8 → rejected.
- [ ] Happy path → success; can sign out and sign in with new password; old password fails.
- [ ] Logged out → `/settings` redirects to login; action returns unauthorized.

### Forgot / reset (B)

- [ ] Unknown email → same success UI as known email.
- [ ] Known email → message arrives; link opens app callback; lands on update-password.
- [ ] Set new password → can access app; old password fails.
- [ ] Expired / reused link → friendly failure → login.
- [ ] Malicious `next` / `redirectTo` → rejected or ignored.

### i18n / a11y

- [ ] en + es strings present.
- [ ] Labels associated with inputs; errors announced.

---

## 8. Non-goals / follow-ups

- Email change + re-verification.
- MFA.
- “Sign out everywhere” button.
- Password strength meter beyond min length.
- Migrating Auth into `src/*/application` use cases (not needed).

---

## 9. Supabase dashboard (human)

### Redirect URLs

Auth → URL configuration — add (adjust port if needed):

- `http://localhost:3000/en/auth/callback`
- `http://localhost:3000/es/auth/callback`
- `http://localhost:3000/en/auth/update-password`
- `http://localhost:3000/es/auth/update-password`
- `https://fiktions.com/en/auth/callback`
- `https://fiktions.com/es/auth/callback`
- `https://fiktions.com/en/auth/update-password`
- `https://fiktions.com/es/auth/update-password`

App `redirectTo` for forgot-password is `…/auth/update-password` (hash-safe).

### Reset password email template (recommended)

Default `{{ .ConfirmationURL }}` often dumps tokens on **Site URL** (home) in the
URL hash. Prefer a server-side token link (Auth → Email Templates → Reset password):

```html
<h2>Reset your password</h2>
<p>Follow the link below to choose a new password.</p>
<p>
  <a
    href="{{ .SiteURL }}/en/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/en/auth/update-password"
    >Reset password</a
  >
</p>
```

If Site URL already includes a path, adjust accordingly. For Spanish-first testing
you can duplicate with `/es/…`, or rely on the in-app `AuthRecoveryRedirect` hash
fallback when the default ConfirmationURL still lands on home.

App also claims `#access_token…&type=recovery` on any page and routes to
`/auth/update-password`.
`)