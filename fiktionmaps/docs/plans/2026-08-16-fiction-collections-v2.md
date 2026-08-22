# Plan v2: `collections` + `episodes` — group works, detail series

Status: draft for agreement. Supersedes `2026-08-16-fiction-collections.md`.
Migrations are **generated**, never applied by the agent.

## TL;DR

- A `fiction` is what a user recognizes and searches for: `movie`, `book`, `tv-series`, `song`.
- The Godfather is **3 fictions**; Game of Thrones is **1 fiction**. Seasons and episodes are not fictions.
- `collections` groups independent fictions: trilogy/saga → movies or books, album → songs. Flat, no recursion.
- `episodes` is a child table of a `tv-series` fiction (season number, episode number, title). Optional data.
- Places always point to a fiction. Episode detail is optional enrichment via `scenes.episode_id`, never a gate for contributing a place.

## Why v2 differs from v1

v1 made every leaf a fiction (`episode` as a fiction type) and made collections recursive to model series → season → episode. That broke two things:

1. **Asymmetry felt wrong** — 3 Godfather fictions vs 1 GOT fiction only made sense if seasons/episodes were also fictions, which would mean ~73 fictions for GOT before a single place could be mapped.
2. **Contribution bottleneck** — a user recognizes “Winterfell, from GOT”. They often do not recall the episode, sometimes not even the season. Requiring an episode row to attach a place blocks the main contribution path.

v2 keeps the unit of recognition as the fiction, and treats episodes as optional detail of a series.

## Model

```text
fictions        movie | book | tv-series | song      ← places attach here
collections     trilogy | saga | album | collection  ← groups fictions (flat)
episodes        belongs to one tv-series fiction     ← optional detail
```

Examples:

```text
collection: The Godfather Trilogy
├── fiction (movie): The Godfather
├── fiction (movie): The Godfather Part II
└── fiction (movie): The Godfather Part III

fiction (tv-series): Game of Thrones
├── place: Winterfell        ← attached to the series
├── place: King's Landing
└── episodes: S1E1 … S8E6    ← optional, filled over time

collection: Abbey Road
├── fiction (song): Come Together
└── fiction (song): Something
```

## Invariants

1. Places attach only to fictions, never to collections or episodes.
2. Collections group fictions only. No collection contains another collection.
3. Episodes belong to exactly one `tv-series` fiction.
4. An episode is never a fiction and never a collection.
5. Episode detail on a scene is optional; a place or scene is valid without it.
6. `collections` is unrelated to `place_relationships`, which relates places rather than works.

## Data model

### `fictions`

Extend the existing type check with `song`; `tv-series` stays as is:

```text
movie | book | tv-series | song
```

No migration of existing rows. `song` unlocks the Music flow.

### `collections`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `type` | `trilogy`, `saga`, `album`, or generic `collection` |
| `name` | Required display name |
| `slug` | Required unique slug |
| `created_at` | Creation timestamp |
| `updated_at` | Update timestamp |

Images, descriptions, credits, and external IDs are deferred until a UI needs them.

### `collection_members`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `collection_id` | Parent collection |
| `fiction_id` | Member fiction |
| `sort_order` | Non-negative display order |
| `created_at` | Creation timestamp |

Constraints:

- Both `collection_id` and `fiction_id` are required (no nullable member column, no recursion).
- `UNIQUE (collection_id, fiction_id)`.
- `sort_order >= 0`.
- Indexes on `collection_id` and `fiction_id`.

### `episodes`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `fiction_id` | Parent fiction, must be `tv-series` |
| `season_number` | Positive integer |
| `episode_number` | Positive integer |
| `title` | Optional episode title |
| `created_at` | Creation timestamp |
| `updated_at` | Update timestamp |

Constraints:

- `UNIQUE (fiction_id, season_number, episode_number)`.
- `season_number > 0`, `episode_number > 0`.
- Parent fiction type must be `tv-series` (enforced in the use case, optionally by trigger like `scenes`/`places` guards).

Seasons are **not** a table in v2. A season is the distinct `season_number` values of a series; grouping happens in queries. If seasons later need their own artwork or copy, promote them to a table then, not now.

### `scenes`

- Add nullable `episode_id` referencing `episodes`.
- Keep `season`, `episode`, `episode_title` during the transition; they stay authoritative until data is backfilled into `episodes`.
- Once backfilled, reads prefer `episode_id` and the legacy columns are dropped in a separate change.

## Allowed structures

| Collection type | Allowed members |
| --- | --- |
| `trilogy` | `movie` fictions |
| `saga` | `movie` or `book` fictions |
| `album` | `song` fictions |
| `collection` | Any fiction type |

Use cases validate member types; the database only enforces shape.

## Flows

### Create a fiction

No collection is required first.

1. User creates the work they recognize: movie, book, series, or song.
2. Attaching it to a collection is a separate, optional step (later, or by staff).

### Add a place

1. Pick the fiction (movie, book, series, or song).
2. Create the place with `relation_kind` (`filmed`, `mentioned`, `inspired_by`, …).
3. For a series, the place attaches to the series — no episode needed.

A recurring set (Winterfell) is one place on the series, which is exactly what the current TV model already does.

### Add episode detail

1. Optional, on a scene: pick or create the episode of that series.
2. Absent episode detail is a normal, valid state.

### Music

1. Create a `song` fiction.
2. Add places with `relation_kind` — lyrics reference, music video shoot, inspiration.
3. Optionally attach the song to an `album` collection.

## Application rules

Use cases must:

1. Validate collection type against member fiction type.
2. Reject duplicate membership and preserve explicit ordering.
3. Reject episodes on non-`tv-series` fictions.
4. Reject an episode whose `(season_number, episode_number)` already exists for that series.
5. Allow scenes and places without episode detail.

Next actions and queries call use cases only, per `docs/reference/architecture.md`.

## Implementation phases

### Phase 1 — Music (no new tables)

1. Add `song` to `fictions.type` (migration + domain + Zod + actions + admin + catalog labels).
2. Add an `artist` credit role and fix `getFictionPrimaryCreditRole` so `song` does not fall back to `director`.
3. Remove the Coming soon gate in the contribute category picker and map `music` → `song`.
4. Optional Spotify provider on the existing `fiction_external_ids`.
5. Song-specific copy for genres, auto-description, duplicate check, and place `relation_kind` labels.

Music ships without collections or episodes.

### Phase 2 — collections

1. Migration for `collections` and `collection_members` with RLS mirroring fictions/places.
2. `src/collections/` module: entity, schemas, repository port and Supabase adapter, use cases (create, update, delete, list, add member, remove member, reorder).
3. Admin-first UI; contribute flow only if demand appears.
4. Surface collection membership on fiction detail (Godfather trilogy, album track list).

### Phase 3 — episodes

1. Migration for `episodes` plus nullable `scenes.episode_id`.
2. `src/episodes/` module with use cases for create, list by series, and attach to scene.
3. Admin UI to manage episodes of a series; optional episode picker in the scene contribute wizard.
4. Backfill `episodes` from existing `scenes.season` / `scenes.episode` / `scenes.episode_title`.
5. Drop the legacy scene columns only after all reads and writes use `episode_id`.

## Out of scope

- Seasons as a table.
- Episodes as fictions or as collection members.
- Recursive collections.
- Places or scenes attached to collections.
- Requiring an episode to contribute a place.
- Automatic import from IMDb, Spotify, or episode catalogs.

## Open decisions

1. Whether a fiction may belong to several collections (recommended: yes; a movie can sit in a trilogy and a broader franchise `collection`).
2. Whether `trilogy` and `saga` are distinct types or a single generic `collection` with a label.
3. Whether collections get public routes and pages, or stay an internal grouping surfaced on fiction pages.
4. Whether an album should be a collection or, later, its own type if music-specific metadata grows.
5. Whether a place may ever be pinned to a specific episode (currently no — series-level only).
