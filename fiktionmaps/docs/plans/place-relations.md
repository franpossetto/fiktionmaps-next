# Plan: place relations (siblings & cousins)

## Naming

| Concept | Name | Real-world | Example |
|---------|------|------------|---------|
| Same real place, **different fictions** | **siblings** | Share `location_id` | Empire State in 30 movies |
| Same fictional venue, **different real locations / spaces** | **cousins** | Share a `site` via join table | One hotel filmed across 4 buildings |

- **Siblings** = many `places` rows pointing to the **same `location_id`** (each keeps its own `fiction_id`, copy, media). Already expressible today.
- **Cousins** = `places` that represent one fictional venue but sit on **different `location_id`**. Membership in a `site` via a join table — **no nullable columns on `places`**.

Avoid: “duplicate”, “alias”, “clone” — they imply one row is canonical and the others wrong.

## Problem

Every `place` is a row tied to one `fiction_id` and one `location_id`. That is correct for content, but:

1. **Siblings** — users should discover “also appears in …” across fictions for the same real spot.
2. **Cousins** — a single fictional place (a hotel, an apartment) is often shot at several real locations / interior vs exterior; today they look like unrelated pins.

## Why not an edge table (`place_relations`)

Symmetric edges explode for groups (they are transitive):

- **Case 1 — Empire State in 30 fictions.** To fully connect the group: C(30,2) = **435 rows**, and fiction #31 adds **30 more**. Unmanageable.
- **Case 2 — Hotel = 4 real locations.** C(4,2) = **6 rows**. Tolerable but already redundant, and grows fast per venue.

Edges only make sense for loose links between *distinct* places (“near”, “seen from”), not for grouping the same site.

## Why not `places.site_id` (nullable FK)

Most places are not cousins → the column would be `NULL` almost always. Prefer **presence = membership**: if a place has no cousins, it simply has **no row** in the join table.

## Data model — 2 new tables for cousins; siblings reuse `location_id`

### Case 1 — Empire State in 30 fictions (siblings)

No new table. All 30 rows already share `location_id`.

`places` (real fields)

| id | name | fiction_id | location_id | shoot_environment |
|----|------|-----------|-------------|-------------------|
| p1 | Empire State | Sleepless… | loc_esb | exterior |
| p2 | Empire State | King Kong | loc_esb | exterior |
| … (up to 30) … | | | loc_esb | |

Siblings query: `select * from places where location_id = 'loc_esb' and id <> :self`.
→ 30 places, **0 new rows**, fiction #31 = just another row with `location_id = loc_esb`.

### Case 2 — Hotel = 4 real locations (cousins)

Two tables: `sites` (the venue) + `site_places` (membership). `places` unchanged — no nulls.

`sites`

| id | name | slug |
|----|------|------|
| s_grandhotel | Grand Budapest Hotel | grand-budapest-hotel |

`places` (unchanged)

| id | name | fiction_id | location_id | shoot_environment |
|----|------|-----------|-------------|-------------------|
| p31 | Hotel — facade | Grand Budapest | loc_a | exterior |
| p32 | Hotel — lobby | Grand Budapest | loc_b | interior |
| p33 | Hotel — room | Grand Budapest | loc_c | interior |
| p34 | Hotel — spa | Grand Budapest | loc_d | interior |

`site_places`

| site_id | place_id |
|---------|----------|
| s_grandhotel | p31 |
| s_grandhotel | p32 |
| s_grandhotel | p33 |
| s_grandhotel | p34 |

Cousins query:

```sql
select p.*
from site_places sp
join site_places sp2 on sp2.site_id = sp.site_id
join places p on p.id = sp2.place_id
where sp.place_id = :self
  and sp2.place_id <> :self;
```

→ 4 membership rows + 1 site. A 5th location = one more `places` row + one more `site_places` row.

`shoot_environment` already distinguishes interior/exterior; no nullable `part` column.

### Migration sketch

```sql
create table sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table site_places (
  site_id uuid not null references sites(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (site_id, place_id),
  unique (place_id) -- a place belongs to at most one site (v1)
);

create index site_places_place_id_idx on site_places(place_id);
```

(`places` / `location_id` unchanged for siblings.)

## Principles

- Keep **one `places` row per fiction scene** (never collapse siblings/cousins into one row).
- **Siblings** derive from existing `location_id` — no schema change.
- **Cousins** = `sites` + `site_places` — linear growth, **no nulls on `places`**.
- Membership is presence of a join row, not a nullable FK.
- Both are grouping keys, not edge lists between places.

## Product surfaces (v1)

- Place detail: “Also appears in” (siblings via `location_id`) / “Other spots of this place” (cousins via `site_places`).
- Map: optionally collapse cousins under one venue; keep sibling pins as-is (same `location_id` = same coords anyway).
- Admin / staff: create/pick a `site`, attach `place`s via `site_places`.

## Out of scope (v1)

- Auto-detect siblings/cousins by name or distance.
- Merging places or shared media pools.
- Nullable `places.site_id` or nullable `part` columns.
- Edge table `place_relations` for loose “near / seen from” links (only if a real need appears).
- A place in more than one `site` (`unique (place_id)` forbids it in v1).

## Open questions

1. `sites` name source: manual (staff) vs derived from a canonical landmark.
2. Do we surface siblings automatically for every shared `location_id`, or only when `locations.is_landmark`?
3. Map: collapse cousins to a single pin + expand, or show all four?
4. Staff-only `site` assignment first, or contributors too?
5. Soft-delete / orphan `sites` with zero members — cascade delete sites when last member leaves?

## Order

1. Confirm naming + rules (siblings = `location_id`, cousins = `sites` + `site_places`)
2. Migration: `sites` + `site_places`
3. Domain types / repo / use cases (list siblings by location, list cousins by site)
4. Admin/staff: create site + attach/detach places
5. Place detail “related” sections
6. Map behavior for cousins
