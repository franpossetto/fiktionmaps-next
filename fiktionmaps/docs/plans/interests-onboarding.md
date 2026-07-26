# Interests Onboarding + Recommendations (v1)

This document defines the data model and application flow for "interests" (curated tags) selected during onboarding, mapped to `fictions`, and used to generate recommendations.

## Goals

- Let users choose interests during onboarding.
- Store user selections in the database (not only in memory/localStorage).
- Keep the interest catalog curated and admin-managed.
- Recommend fictions based on user interests.
- Support locale-based labels/description via DB translations.

## Entities / Tables

1. `public.interests`
   - Purpose: canonical catalog of selectable interests/tags (e.g. `action`, `drama`, `tarantino`).
   - Stable identifier: `key` (slug). The app references `key` across locales.
   - Suggested fields:
     - `id uuid primary key default gen_random_uuid()`
     - `key text not null unique`
     - `category text null` (optional grouping: genre/person/era/etc)
     - `active boolean not null default true`
     - `created_at timestamptz not null default now()`
     - `updated_at timestamptz not null default now()`

2. `public.interest_translations`
   - Purpose: localized presentation data for each interest.
   - Suggested fields:
     - `(interest_id, locale)` composite primary key
     - `interest_id uuid references public.interests(id) on delete cascade`
     - `locale text not null` (e.g. `en`, `es`)
     - `label text not null`
     - `description text null`
   - App behavior:
     - Prefer the current `locale`.
     - Fallback to `label = interests.key` (or a default locale) when translation is missing.

3. `public.fiction_interests`
   - Purpose: connect `fictions` with interests (many-to-many).
   - Adds meaning for recommendations through `weight`.
   - Suggested fields:
     - `fiction_id uuid references public.fictions(id) on delete cascade`
     - `interest_id uuid references public.interests(id) on delete cascade`
     - `weight smallint not null default 1`
     - `created_at timestamptz not null default now()`
     - Primary key: `(fiction_id, interest_id)`
   - `weight` scale (simple admin-friendly):
     - `1` = weak / secondary match
     - `2` = strong / primary match
     - `3` = very strong / defining match (optional)

4. `public.user_interests`
   - Purpose: connect an authenticated user with interests selected during onboarding (many-to-many).
   - In this v1 design, `user_interests` stores just the association (no `weight`).
   - Suggested fields:
     - `user_id uuid references auth.users(id) on delete cascade`
     - `interest_id uuid references public.interests(id) on delete cascade`
     - `source text not null default 'onboarding'`
     - `created_at timestamptz not null default now()`
     - Primary key: `(user_id, interest_id)`

## RLS / Permissions (high-level)

- `interests` and `interest_translations`
  - Readable by `anon`/`authenticated` (needed to render onboarding UI).
  - Writable only by admin role (or via server-side service-role API).

- `fiction_interests`
  - Readable publicly (so recommendations can run in server/client).
  - Writable only by admin role.

- `user_interests`
  - `SELECT`, `INSERT`, `DELETE` allowed only where `user_id = auth.uid()`.
  - No user should read/modify other users' interests.

## Data Flow

### Admin authoring

1. Admin creates interests in `public.interests`.
2. Admin adds translations into `public.interest_translations` per locale.
3. Admin assigns interests to fictions in `public.fiction_interests` (with `weight` 1..3).

### User onboarding

1. Onboarding UI fetches active interests from `GET /api/interests?locale=...`.
2. User selects multiple interests.
3. On completion, the app persists the selected interest ids into `public.user_interests` for `auth.uid()`.
4. The app marks `profiles.onboarding_completed = true` (existing behavior).

### Recommendation (v1)

- Score a fiction by summing the weights of its interests that the user selected.
- Only consider fictions that are active (consistent with existing `fictions.active` behavior).

Conceptual scoring:

```
score(fiction) = SUM(fiction_interests.weight)
  where fiction_interests.interest_id in user_interests(interests selected by user)
```

Then:

- Order by `score(fiction)` desc.
- Filter out inactive fictions.
- Return top N fictions.

## API Endpoints (suggested)

- `GET /api/interests?locale=...`
  - Returns active interests: `{ id, key, label }` (with locale-based label).

- `POST/PUT /api/user/interests` (auth required)
  - Persists onboarding selections (replace existing selections or upsert).
  - Server enforces `user_id = auth.uid()`.

- `GET /api/recommendations/fictions?locale=...` (auth required)
  - Returns recommended fictions for the current user using the v1 matching logic.

- Admin-only endpoints (implementation-specific)
  - Assign/remove interests for a given fiction (`fiction_interests`).

## Notes / Edge Cases

- Translation missing:
  - If a translation for the requested `locale` does not exist, return `label = interests.key` as fallback.

- Deactivation:
  - If an interest is set to `active = false`, it should be excluded from onboarding catalog and recommendation scoring.

- Cleanup:
  - When interests are deleted, `ON DELETE CASCADE` ensures junction tables are cleaned automatically.

## Next Steps (beyond v1)

- Add user-driven weights (if needed) to support "weak/strong preference" selection.
- Category filtering (e.g. recommend by `category` groups).
- Hybrid matching: combine interests with other signals (visited places, genres, etc.).

