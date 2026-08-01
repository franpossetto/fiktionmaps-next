# Plan: profile photo upload

Status: implemented (D1–D6). Migrations are **generated only**,
never applied by the agent (`068_profile_avatar_storage_rls.sql`).

## Goal

Let a signed-in user **upload their own profile photo** (not only pick a character
avatar from onboarding) and see it everywhere `profiles.avatar_url` is resolved.

Out of scope (v1):

- Moderated / staff-reviewed profile photos
- Onboarding step redesign (character picker can stay; upload is post-onboarding)
- Profile banner / cover photo
- Crop UI beyond a simple square preview (optional later)
- Removing character avatars from onboarding

---

## 0. Open decisions

| # | Topic | Recommendation | Alternatives |
|---|---|---|---|
| D1 | Storage | Reuse bucket `asset-images` + `asset_images` with `entity_type = 'profile'` | New `profile-avatars` bucket — extra migration/RLS, duplicates resize pipeline |
| D2 | Canonical display field | Keep writing the public URL into `profiles.avatar_url` (source of truth for UI) | Always join `asset_images` at read time — more queries, breaks current feed mappers |
| D3 | Which variant URL to store | `lg` (800px for profile aside); also generate `xs` + `sm` for chips | Store only `sm` (too soft on retina/large aside) |
| D4 | Entry point UI | Own profile only: click avatar → file picker → upload → refresh | Settings page; also allow upload in onboarding |
| D5 | Character avatars | Keep as fallback / onboarding default; custom photo **replaces** `avatar_url` | Dual mode (preference “use character” vs “use photo”) — overkill for v1 |
| D6 | Storage RLS | Tighten so users can only write under `profile/{theirUserId}/…` | Leave broad authenticated write (current) — weaker |

Until confirmed, the rest of this plan assumes **D1–D6 recommendations**.

---

## 1. Discovery

### 1.1 What already exists

| Piece | Path / note |
|---|---|
| Column | `profiles.avatar_url` (`001_profiles_table.sql`) |
| Onboarding set | `completeOnboardingUseCase` writes avatar **id** (`manchi` / `cucho` / `mijo`) |
| Resolver | `lib/avatars.ts` → id → `/avatars/{theme}/…`; **HTTP URL used as-is** |
| Character assets | `public/avatars/{light\|dark}/*.png` + `data/onboarding.json` |
| Upload pipeline | `uploadEntityImage` / `validateImageFile` in `lib/asset-images/image-variant-service.ts` |
| Entity type | DB + TS already allow `entity_type = 'profile'` (`011`, `017`) |
| Bucket | `asset-images` (public, webp, 5 MB limit) |
| Profile update port | `updateProfileUseCase` + `UsersRepositoryPort.updateProfile` (accepts `avatar_url`) |
| Own-profile RLS | `profiles: users can update own` |
| next/image | `**.supabase.co` already in `remotePatterns` |

### 1.2 Gaps

1. **No action** that uploads a profile image or updates `avatar_url` after onboarding.
2. **No UI** on profile to pick/replace a photo.
3. **Storage policies** allow any authenticated user to write anywhere in `asset-images` (same for fiction/place today); for profile we should scope by `auth.uid()`.
4. Auth `preferences.avatar` can override the DB value on own profile for the session after onboarding — after a photo upload, client state must refresh so stale character id does not win.

### 1.3 Why not a new bucket

`uploadEntityImage` already:

- validates JPEG/PNG/WebP/GIF
- resizes with sharp → webp variants
- uploads to `asset-images` at `{entityType}/{entityId}/{role}/{variant}_{version}.webp`
- upserts `asset_images` rows

A dedicated bucket would reimplement that for no product gain. Avatars are public; signed URLs are not required.

### 1.4 Architecture constraints

- Action / query → **use case** → port (see `.cursor/rules/fiktionmaps-architecture.mdc`).
- Composition root may call `uploadEntityImage` (existing pattern in fiction actions) then a **use case** to persist `avatar_url`.
- Do not put business orchestration only in the action; prefer e.g. `updateProfileAvatarUseCase` that receives the uploaded URL (or a thin storage port if we want stricter purity later).

---

## 2. Product shape

### 2.1 User flow (v1)

1. User opens **own** profile (`/profile` or equivalent).
2. Taps avatar (camera affordance on hover/focus).
3. Native file picker (`accept="image/*"`).
4. Client validates type/size (mirror `validateImageFile` limits: 10 MB; bucket is 5 MB webp output so input can be larger before sharp).
5. Calls server action with `FormData` + file.
6. On success: optimistic or refetch profile; avatar updates in header, aside, feeds that read `avatar_url`.

### 2.2 Data contract after upload

| Store | Value |
|---|---|
| Storage path | `profile/{userId}/avatar/sm_{ts}.webp` (+ `xs_…`) |
| `asset_images` | `entity_type=profile`, `entity_id=userId`, `role=avatar`, variants `xs` + `sm` |
| `profiles.avatar_url` | Public URL of **`lg`** variant (800px — profile aside) |

`getAvatarSrc(avatar_url)` sees `http…` → returns URL unchanged. Character ids remain valid for users who never upload.

### 2.3 Replace / clear

| Action | Behavior |
|---|---|
| Replace photo | `uploadEntityImage({ replace: true })` + update `avatar_url` |
| Clear photo (optional v1) | Set `avatar_url` to `null` (or last character id if we stored it — **v1: null → initials/logo fallback**). Optionally delete `asset_images` rows for that profile avatar. |

v1 can ship **replace only**; clear as follow-up.

---

## 3. Backend

### 3.1 Use case

New: `src/users/application/update-profile-avatar.usecase.ts`

```
updateProfileAvatarUseCase(userId, { avatarUrl }, usersRepo) → Profile
```

- Validates non-empty URL string (or null for clear).
- Calls `usersRepo.updateProfile(userId, { avatar_url })`.
- No Supabase client inside the use case.

Upload stays in the action (or a small `lib` helper) using existing `uploadEntityImage`, same as fiction cover upload — then pass resulting URL into the use case.

### 3.2 Server action

In `src/users/infrastructure/next/user.actions.ts` (or dedicated `user-avatar.actions.ts` if file grows):

`updateMyProfileAvatarAction(formData: FormData)`

1. `getSessionUserId()` — unauthorized → error.
2. Read `file` from formData; `validateImageFile`.
3. `uploadEntityImage({ entityType: "profile", entityId: userId, role: "avatar", variants: ["xs", "sm"], file, replace: true })`.
4. Pick `urls.sm` (fallback `urls.xs`).
5. `updateProfileAvatarUseCase(userId, { avatarUrl }, repo)`.
6. `updateTag(\`user-profile-${userId}\`)` (and any other tags used for public `/u/[username]` if cached).

Result type (UI contract, next layer only):

```ts
{ success: true; avatarUrl: string } | { success: false; error: string }
```

### 3.3 Migration (D6) — storage RLS for profile paths

Generate only, e.g. `067_profile_avatar_storage_rls.sql` (number may shift):

- Drop or narrow the blanket “authenticated upload/update/delete on entire `asset-images`” **only if** product is ready to tighten **all** entity types; **preferred v1**: add **additional** policies that are sufficient for profile, and leave fiction/place as-is until a broader storage hardening pass.

Minimum viable hardening for profile:

- INSERT/UPDATE/DELETE on `storage.objects` where  
  `bucket_id = 'asset-images'`  
  AND `name` like `profile/{auth.uid()}/%`

If current policies already allow any authenticated write, the extra policies are redundant but document intent; a later migration can revoke the broad ones.

Also ensure `asset_images` table RLS still allows the uploader to insert/delete rows for their own `entity_id = auth.uid()` when `entity_type = 'profile'` (today insert is open to authenticated — acceptable for v1, tighten later).

### 3.4 Bucket size note

`asset-images` file_size_limit is **5 MB** (webp objects). Sharp output for `sm`/`xs` is well under that. Input validation can stay at 10 MB in app code; if sharp fails or upload rejects, surface a clear error.

---

## 4. Frontend

### 4.1 Components

| Piece | Responsibility |
|---|---|
| `ProfileAvatarEditor` (new, client) | Overlay button on avatar; hidden `<input type="file">`; loading/error; calls action |
| Wire into | `profile-meta-aside.tsx` and/or `profile-header.tsx` when `isOwnProfile` |
| i18n | `messages/en.json` + `es.json` under `Profile` (`changePhoto`, `uploading`, errors) |

Reuse existing visual language (rounded square avatar in aside). No new card chrome; affordance = camera icon button on the image.

### 4.2 Client state after success

- Prefer refetching profile via existing profile query / `refetchProfile` in `user-profile.tsx`.
- Clear or update `preferences.avatar` in auth context so it does not override the new URL (`preferences?.avatar \|\| profile.avatar` today).

### 4.3 Onboarding (v1)

No change required. Users still pick a character; later they can replace with a real photo from profile. Optional later: “Upload photo” on the avatar step.

---

## 5. Implementation steps

### Step 1 — Use case + action

1. Add `update-profile-avatar.usecase.ts`.
2. Add `updateMyProfileAvatarAction` wiring: validate → `uploadEntityImage` → use case → cache tags.
3. Manual smoke: call action with a test image (staff/dev account).

### Step 2 — UI on own profile

1. `ProfileAvatarEditor` on meta aside (primary surface) and compact header if used.
2. Loading spinner on avatar; toast or inline error on failure.
3. i18n strings.

### Step 3 — Auth preference footgun

1. After successful upload, set `preferences.avatar` to the new URL (or `undefined`) so own-profile UI does not keep showing the onboarding character for the rest of the session.
2. On session bootstrap, do **not** invent a preferences avatar from nowhere — prefer DB `avatar_url` always when preferences are null (already mostly true).

### Step 4 — Storage RLS migration (generate)

1. Add migration for profile-scoped storage paths (D6).
2. Document in plan status when applied in remote/local by humans.

### Step 5 — Docs

When shipped, move durable notes into `docs/reference/` (short “Profile avatar” subsection under users/profiles if such a doc exists; otherwise a few paragraphs in architecture or a small `profile-avatars.md` reference). Delete or mark this plan implemented.

---

## 6. Test plan

- [ ] Own profile: upload JPEG → avatar updates in aside and lists that show `UserAvatar`.
- [ ] Replace photo twice → old storage objects / `asset_images` rows cleaned (`replace: true`).
- [ ] Other user’s public profile: no upload control; their photo still visible.
- [ ] User with only character id: still resolves theme PNGs.
- [ ] User with HTTP `avatar_url`: theme does not rewrite URL.
- [ ] Unauthorized / logged out: action returns error.
- [ ] Invalid file type / oversized: clear error, no partial DB update.
- [ ] After upload in same session: onboarding character preference does not override photo.
- [ ] `next/image` loads Supabase public URL without config errors.

---

## 7. Non-goals / follow-ups

- Client-side crop / focal point (reuse `image-focus` later if needed).
- Onboarding upload step.
- Strict revoke of global `asset-images` write policies for all entity types.
- CDN cache bust beyond versioned filenames (already in `uploadEntityImage` via `Date.now()`).

