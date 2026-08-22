# Plan: `place_relationships` — relationships between places

Status: agreed for implementation. Replaces `2026-07-26-place-relations.md`.
Migrations are **generated**, never applied by the agent.

## Goal

Declare that two or more places are related, with two types:

| type | Meaning | Example |
|------|---------|---------|
| `shared` | Same real-world site, different fictions | Rockefeller in Batman, Home Alone, a book, etc. |
| `composite` | Same fictional venue, different real points | Hotel = facade + lobby (int/ext) |

One group table + one members table. No new columns on `places`.

Historical aliases (old naming only): siblings ≈ `shared`, cousins ≈ `composite`.

---

## Invariant

**1 place ↔ 1 location. Always.**

“Reuse location” in the clone flow means **start from** the source location’s data and **insert a new row**. Never share `location_id`.

“Same place” / “same venue” identity is **not derived** from coords or `external_id` (Mapbox is unstable; each create inserts its own location). It is **declared** in `place_relationships`.

`places.relation_kind` (`filmed` / `featured` / …) is a different concept: how the place relates to *its* fiction. Do not confuse the two.

---

## What each type covers

| Situation | Mechanism |
|-----------|-----------|
| Same site, another work (`movie` / `book` / `tv-series`, and future types) | **`shared`** |
| Same site, multiple scenes/chapters of *the same* work | **one place** + `scene_places` (not a relationship) |
| Same fictional venue, multiple real points | **`composite`** |

`shoot_environment` labels interior/exterior; no `part` column needed.

---

## Data model

```
place_relationships          (id, type, name, slug, created_at, updated_at)
place_relationship_members   (id, place_relationship_id, type, place_id, created_at)
```

**One table pair** (not one per type). `shared` and `composite` share the same pattern; the difference is `type` plus use-case validation.

- `slug` on the group: required, `UNIQUE`.
- **No** `fiction_id` on members (resolve via `places`).
- A place belongs to **at most one** group per type (it may sit in one `shared` and one `composite` at once).
- Why: `shared` is transitive identity (A≈B≈C → one group); `composite` is “piece of one venue” in v1.
- `type` denormalized on members + composite FK `(place_relationship_id, type)` so partial unique indexes per type can be enforced (see historical plan §2.1 for SQL detail if needed).

### Example

```
locations:  loc1, loc2, loc3   (distinct rows; loc2 cloned from loc1)
places:     p1→loc1 (Batman), p2→loc2 (Home Alone), p3→loc3 (Batman lobby)

place_relationships
  r1  shared     "Rockefeller Center"   slug: rockefeller-center
  r2  composite  "Gotham Tower"         slug: gotham-tower

place_relationship_members
  r1  shared     p1, p2
  r2  composite  p1, p3
```

---

## Primary flow: “Add this place to another fiction”

1. Source place A + target fiction.
2. Clone location A → location B (new row, same geo/address/city/etc.).
3. Create place B (fiction name, description, photo editable).
4. Create a `shared` group or join A’s existing `shared`; members: A and B.

Use case: `clone-place-to-fiction`.

## Secondary flow: composite

Admin (or approved contribution) links existing places into a `composite` group. UI v1 limits pickers to the **same fiction**; the DB does not enforce that (cross-fiction composites remain possible later).

---

## Migration (sketch)

```sql
CREATE TABLE public.place_relationships (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT place_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT place_relationships_slug_unique UNIQUE (slug),
  CONSTRAINT place_relationships_type_check CHECK (type IN ('shared', 'composite')),
  CONSTRAINT place_relationships_id_type_unique UNIQUE (id, type)
);

CREATE TABLE public.place_relationship_members (
  id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
  place_relationship_id  UUID        NOT NULL,
  type                   TEXT        NOT NULL,
  place_id               UUID        NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT place_relationship_members_pkey PRIMARY KEY (id),
  CONSTRAINT place_relationship_members_unique UNIQUE (place_relationship_id, place_id),
  CONSTRAINT place_relationship_members_group_fkey
    FOREIGN KEY (place_relationship_id, type)
    REFERENCES public.place_relationships (id, type) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_place_rel_members_one_shared
  ON public.place_relationship_members (place_id) WHERE type = 'shared';
CREATE UNIQUE INDEX idx_place_rel_members_one_composite
  ON public.place_relationship_members (place_id) WHERE type = 'composite';
CREATE INDEX idx_place_rel_members_place
  ON public.place_relationship_members (place_id, place_relationship_id);
```

RLS: public read; staff write on the relationship tables (`is_staff_profile()`), mirroring 057. Contributors do **not** write these tables directly — they go through the contribution approve path (service/staff). Update `database.types.ts` by hand in the same change.

Migration number: next free number at implementation time (do not reuse 072 if already taken).

---

## Code

Module `src/place-relationships/`:

- **domain:** entity (`shared` \| `composite`), Zod schemas, repo port.
- **application:** `get-place-relationships`, `create-place-relationship`, `add-member`, `remove-member`, `clone-place-to-fiction`, plus contribution submit/approve hooks as needed.
- **infrastructure/supabase:** only place with `supabase.from("place_relationships" | …)`.
- **infrastructure/next:** cached queries + actions → use cases → `updateTag` for **all** places in the group.

Architecture: actions only wire deps and call use cases; no business-table `supabase.from` in next.

`remove-member` / delete-group: admin only. After any membership change, the group must have **≥ 2 members** or be **deleted** (UI + use case; no singleton groups).

---

## UI v1

- **Admin:** “Add this place to another fiction” button + panel to create/attach/remove members (`shared` / `composite`). Removing a member that would leave &lt; 2 members is blocked unless the user deletes the whole group.
- **Contribute:** new contribution type on the catalog (e.g. `link_place_relationship` — final slug TBD), **1 FPP** on approve. Covers proposing a link (clone-to-fiction / shared, or composite). **Not** in scope for contributions: removing members.
- **Public (place detail):**
  - `shared` → “Also appears in” (by fiction).
  - `composite` → “Other spots of this place” (use `shoot_environment`).

**Out of v1:** collapse `composite` on the map; auto-detect candidates by coords.

---

## Decisions (closed)

| # | Topic | Decision |
|---|--------|----------|
| O1 | Type names | `shared` / `composite` |
| O2 | `name` | Always required (`NOT NULL`) |
| O3 | Composite fiction | DB allows mixed fictions; **UI v1 limits to same fiction** |
| O4 | Who writes | Staff via admin. Contributors via a **new contribution type, 1 FPP** on approve. No direct contributor writes to relationship tables. |
| O5 | Orphan / singleton groups | Not allowed. Admin edit only for remove. After edits: **≥ 2 members or delete the group**. Remove-member is **not** a contribution. |

Also closed earlier:

- One table pair, not two.
- No `fiction_id` on members.
- No `location_id` reuse (always clone).
- Uniqueness: a place ≤ 1 shared and ≤ 1 composite.

---

## Order

1. Migration + `database.types.ts` (+ contribution type enum / FPP = 1 when that slice lands).
2. Domain + port + adapter + use cases (including `clone-place-to-fiction`, membership rules ≥ 2).
3. Actions/queries + admin button + panel.
4. Contribution type + catalog + approve path (1 FPP).
5. Public sections on place detail.
6. Wrap-up: extend `docs/reference/places-and-locations.md` and `docs/reference/contributions.md`, delete this plan and `2026-07-26-place-relations.md`.

---

## Implementation notes (PR1 — admin)

Closed at implement time:

- **Merge of distinct `shared` groups:** blocked for now (error; admin must remove membership first).
- **Clone photo:** new place has **no** image; user uploads afterward.
- **Clone persistence:** location + place rows are created only on successful submit of the full clone action (no draft location).
- **Migration:** `078_place_relationships.sql` with enum `place_relationship_type`.
- **Out of this PR:** contributions, public place-detail sections, reference doc wrap-up.

## Implementation notes (PR2 — contributions)

- Type: `link_place_relationship` (1 FPP); staging `contribution_pending_place_relationships`.
- Migration: `079_link_place_relationship_contribution.sql` (apply manually).
- Wizard: `/contribute/place-relationship` (shared clone + composite).
- Approve applies clone / create-relationship use cases; remove-member stays admin-only.
- **Still out:** public place-detail sections; places-and-locations reference wrap-up.
