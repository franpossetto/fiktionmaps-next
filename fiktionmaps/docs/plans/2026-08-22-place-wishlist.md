# Plan: place wishlist (“Quiero visitar”)

Status: draft for agreement.  
Migrations are **generated**, never applied by the agent.  
**Distinct from `collections`:** wishlist = user travel intent on **places**; collections = editorial grouping of **fictions**.

## TL;DR

- Table `place_wishlists` (`user_id`, `place_id`), same shape as `fiction_likes` but **own-only RLS** in v1.
- Toggle on place detail (`initialWishlisted` from RSC); list on own profile; public URL in Phase 2.
- Fixed architecture: domain → supabase adapter → use cases → next actions/queries → UI.
- Out of v1: named lists, custom order, affiliates, Expo, collections.

## Goal

Let a signed-in user mark places as **want to visit**, see them on their profile, and (next phase) share the list. Gives a reason to create an account without GPS; bridges toward check-in.

## Out of scope (v1)

- Multiple lists / names / collaboration
- Fiction wishlist (that is like)
- Collections / trilogy / series
- “You’re nearby” notifications
- Hotel/tour affiliates
- Expo app
- Public counter “N people want to visit” (v1.1 if social proof helps)

---

## 0. Open decisions

| # | Topic | Recommendation | Alternatives |
|---|---|---|---|
| D1 | Granularity | Wishlist of **place** | Fiction-only (not enough for travel) |
| D2 | List visibility | v1: owner only on `/profile`; v1.1: public at `/u/[username]/want-to-visit` | Public from day one |
| D3 | Auth on toggle | Login required; guest → `/login` with return URL | Soft-save in localStorage |
| D4 | Relation to check-in | Independent; UI may show “visited” if same place has a check-in | Auto-remove from wishlist on check-in (later) |
| D5 | Uniqueness | PK `(user_id, place_id)` | Soft delete / notes |
| D6 | Product copy | ES: “Quiero visitar” / EN: “Want to visit” | “Save”, “Bookmark” |

Until confirmed otherwise, the rest of this plan assumes **D1–D6 recommendations**.

---

## 1. Discovery (already exists)

| Piece | Note |
|---|---|
| `fiction_likes` | Model + RLS mirror (`020_fiction_likes.sql`) |
| Toggle like use case | `toggleFictionLikeUseCase` |
| Place detail | `FictionPlaceDetailView` + `/fictions/[slug]/places/[placeId]` |
| Profile | `ProfileLikedFictions` — same section pattern |
| Check-ins | `place_checkins` — do not mix tables; `EnrichedPlaceCheckin` is the profile-card join pattern to copy (not reuse) |
| Place public rule | `isApprovedActivePlace` |
| Architecture | action/query → use case → repo port; no `supabase.from` in next |

---

## 2. Data model

### `place_wishlists`

| Column | Definition |
|---|---|
| `user_id` | UUID FK → `auth.users`, ON DELETE CASCADE |
| `place_id` | UUID FK → `places`, ON DELETE CASCADE |
| `created_at` | timestamptz default now() |

Constraints / indexes:

- PK `(user_id, place_id)`
- Index on `place_id` (future counts / joins)
- Index on `user_id` (profile list)

### RLS

Unlike `fiction_likes` (public `SELECT` for catalog counts), v1 has **no** public counter or public list. Do not leak who wants to visit what.

- `SELECT`: own rows only (`user_id = auth.uid()`), `authenticated`
- `INSERT` / `DELETE`: only `user_id = auth.uid()`
- No `UPDATE` in v1
- No `anon` `SELECT` in v1

Grants: `SELECT, INSERT, DELETE` to `authenticated` only.

Phase 2 (public list / counts): add `SELECT` for `anon` + `authenticated` (`USING (true)`), same as likes.

---

## 3. Application (`src/place-wishlists/`)

```
domain/
  place-wishlist.entity.ts      # { userId, placeId, createdAt }
  place-wishlist.repository.ts  # port
application/
  toggle-place-wishlist.usecase.ts
  is-place-wishlisted.usecase.ts              # one place (detail RSC)
  list-place-wishlist-items.usecase.ts        # profile cards (joined display fields)
  get-wishlisted-place-ids.usecase.ts         # optional later (map/list badges)
infrastructure/
  supabase/place-wishlist.repository.impl.ts
  next/place-wishlist.actions.ts
  next/place-wishlist.queries.ts
  next/place-wishlist.actions.types.ts
```

### Use cases

1. **`togglePlaceWishlistUseCase(userId, placeId, wishlistRepo, placesRepo)`** → `{ wishlisted: boolean }`
2. **`isPlaceWishlistedUseCase(userId, placeId, repo)`** → `boolean` for place-detail RSC
3. **`listPlaceWishlistItemsUseCase(userId, repo)`** → profile cards (`PlaceWishlistItem`)
4. **`getWishlistedPlaceIdsUseCase`** — not required for v1 (one-place hydrate uses #2)

Validations on toggle: `placeId` UUID; **`placesRepo.isApprovedActivePlace(placeId)`** (same public rule as place detail). Reject pending/inactive.

`PlaceWishlistItem` is a **display DTO** (not the `place_wishlists` row). Same idea as `EnrichedPlaceCheckin`: the join of wishlist + place + fiction + city + image so the profile can render a card without extra client fetches. Dedicated type — do not reuse the check-in entity (no GPS / verified / distance).

### Next edge

- Actions live in `src/place-wishlists/infrastructure/next/`, not `user.actions.ts`
- `togglePlaceWishlistAction(placeId)` — session → use case → `{ success, wishlisted }` / error
- Place detail RSC: `isPlaceWishlisted` query → pass `initialWishlisted` into the client button. No extra action on mount
- Profile RSC: `listPlaceWishlistItems` for the current user (own profile only)
- User-scoped: **no** `unstable_cache`. On toggle: `revalidatePath` profile (and the place path if the RSC paints the button). **Do not** `updateTag("fictions")` — wishlist does not change the public catalog (likes do, because of counts)

---

## 4. UI

### 4.1 Place detail (v1 must)

In `FictionPlaceDetailView`, near directions:

- Button **Want to visit** / **On my list** (toggle)
- Logged out → login with `?next=` back to the place
- Optional optimistic UI (same spirit as fiction like)
- Hydrate with `initialWishlisted` from the place-detail RSC (query → use case). Do not fetch on client mount.

### 4.2 Profile (v1 must)

Section **“Want to visit”** (own profile):

- Place list: thumb, name, fiction, city
- Link to `/fictions/{slug}/places/{placeSlug}`
- Empty state + CTA to map / fictions

### 4.3 Map (v1 nice-to-have)

Wishlist-only filter or badge — **defer** if it stretches the slice.

### 4.4 i18n

Keys in `messages/en.json` + `es.json` (Fictions / Profile namespaces).

---

## 5. Implementation phases

### Phase 1 — foundation (ship)

1. Migration `place_wishlists` + RLS + grants (generate only; do not apply).
2. Domain + port + supabase adapter (injectable `getSupabase` if the new module starts clean).
3. Use cases: toggle (approved+active), is-wishlisted, list profile items.
4. Actions / queries in `place-wishlists/infrastructure/next`.
5. Button on place detail + section on own profile.
6. i18n ES/EN.
7. Smoke: toggle, refresh, empty, unauthorized.

### Phase 2 — share (growth)

1. Widen RLS `SELECT` to anon (public list / future counts).
2. Public page `/u/[username]/want-to-visit` (or section on public profile).
3. Share button (Web Share / copy link).
4. Basic OG metadata for the list.

### Phase 3 — retention / money (later)

1. Hint when the same place has a check-in (“Already visited”).
2. Map wishlist filter.
3. Affiliate block “near these places” only once list/detail has traffic.

---

## 6. Architecture checklist

- [ ] No `supabase.from` in actions/queries
- [ ] Actions only composition-root → use case
- [ ] DTOs `{ success, error }` in `*.actions.types.ts`, not in domain schemas
- [ ] Do not mix with `collections` or `fiction_likes`
- [ ] Toggle does not `updateTag("fictions")`
- [ ] v1 RLS: no anon `SELECT`
- [ ] Regenerate types (`gen:types`) after you apply the migration

---

## 7. Test plan

- [ ] User A wishlists a place → shows on A’s profile; not on B’s
- [ ] Toggle off deletes the row
- [ ] Guest cannot insert; UI sends to login
- [ ] Place delete / CASCADE clears wishlist rows
- [ ] RLS: another user cannot SELECT or DELETE someone else’s row
- [ ] Cannot wishlist a pending / inactive place
- [ ] Place detail shows correct state after reload (RSC `initialWishlisted`)
- [ ] Profile empty state OK

---

## 8. Effort

~**1–2 days** for Phase 1 if mirroring `fiction_likes`. Phase 2 ~half a day more.
