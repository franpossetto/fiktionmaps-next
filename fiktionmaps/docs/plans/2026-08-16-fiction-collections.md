# Plan: `collections` — group works across media

Status: draft for agreement.
Migrations are **generated**, never applied by the agent.

## TL;DR

- `fictions` contains only map-worthy works: `movie`, `book`, `episode`, `song`.
- `collections` contains groups: `trilogy`, `series`, `season`, `album`, or a generic `collection`.
- `collection_members` supports recursion: a collection contains either a fiction or another collection.
- Every branch ends in a `fiction_id`; places remain linked only to fictions.
- One shared model covers albums, trilogies, and TV hierarchies instead of three separate implementations.

## Goal

Separate **works** from **containers**:

```text
album → song
trilogy → movie | book
series → season → episode
```

Do not confuse this model with `place_relationships`, which relates places rather than works.

## Invariants

1. Places belong only to `fictions`, never to collections.
2. A collection member references either a fiction or a child collection, never both.
3. Every collection branch must end in a fiction.
4. Collections may be recursive, but cycles are forbidden.
5. Allowed parent/child combinations are validated by use cases.

## Data model

### `fictions`

Keep only works that can own places:

```text
movie | book | episode | song
```

Existing `tv-series` rows need a transition plan because a series becomes a collection rather than a fiction.

### `collections`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `type` | `collection`, `trilogy`, `series`, `season`, or `album` |
| `name` | Required display name |
| `slug` | Required unique slug |
| `created_at` | Creation timestamp |
| `updated_at` | Update timestamp |

Descriptions, images, credits, and external IDs are deferred until a concrete UI requires them.

### `collection_members`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `collection_id` | Parent collection |
| `fiction_id` | Member work, nullable |
| `child_collection_id` | Member subcollection, nullable |
| `sort_order` | Non-negative display order |
| `created_at` | Creation timestamp |

Database constraints:

- Exactly one of `fiction_id` and `child_collection_id` must be present.
- A collection cannot contain itself.
- Duplicate members inside the same collection are forbidden.
- `sort_order` must be non-negative.

Cycle prevention requires application validation because a simple row constraint cannot detect longer recursive cycles.

## Allowed structures

| Collection type | Allowed direct members |
| --- | --- |
| `album` | `song` fictions |
| `trilogy` | `movie` or `book` fictions |
| `collection` | `movie` or `book` fictions; broader support can be added later |
| `series` | `season` collections or direct `episode` fictions |
| `season` | `episode` fictions |

Examples:

```text
album: Abbey Road
└── song: Come Together

trilogy: The Matrix Trilogy
├── movie: The Matrix
├── movie: The Matrix Reloaded
└── movie: The Matrix Revolutions

series: Breaking Bad
└── season: Season 5
    └── episode: Ozymandias
```

## Places and scenes

- `places.fiction_id` remains unchanged.
- A song place uses `relation_kind` to distinguish lyrics, music video, inspiration, or another connection.
- Movie scenes remain attached to the movie fiction.
- TV scenes eventually attach to an episode fiction.
- Existing `scenes.season`, `scenes.episode`, and `scenes.episode_title` remain during migration and are removed only after TV data is moved safely.

## Application rules

Use cases must:

1. Validate the collection type and member type.
2. Prevent self-membership and recursive cycles.
3. Prevent duplicate membership.
4. Preserve explicit member ordering.
5. Reject deleting a non-empty collection unless removal is explicitly requested.

All Next actions and queries must call these use cases according to the project architecture.

## Implementation phases

### Phase 1 — collections foundation

1. Create migrations for `collections` and `collection_members`, including indexes and RLS.
2. Add the collections domain entity, schemas, repository port, Supabase adapter, and use cases.
3. Add operations to create, update, delete, read, add members, remove members, and reorder members.
4. Add an admin-first collections UI.

### Phase 2 — Music

1. Add `song` to `fictions.type`.
2. Add the `artist` credit role.
3. Enable the Music contribute flow using the existing `create_fiction` contribution.
4. Support optional Spotify track IDs through `fiction_external_ids`.
5. Allow albums and song membership through collections.

### Phase 3 — trilogies and book collections

1. Create `trilogy` and generic `collection` records.
2. Attach existing movie and book fictions.
3. Show collection membership and ordered works on fiction detail pages.

### Phase 4 — TV migration

1. Create `series` and `season` collections.
2. Introduce `episode` fictions.
3. Convert existing `tv-series` data incrementally.
4. Move scene season/episode metadata to episode fictions.
5. Remove legacy TV fields only after all reads and writes use the new model.

## Out of scope for the first implementation

- Separate tables for albums, TV shows, and trilogies.
- Places attached directly to collections.
- Automatic import of Spotify, IMDb, or episode catalogs.
- Full TV migration in the same change as Music.
- Arbitrary collection graphs beyond the allowed structures above.

## Open decisions

1. Whether a fiction may belong to multiple collections of the same type.
2. Whether `trilogy` should be a distinct type or use generic `collection`.
3. Whether a series may contain direct episodes and seasons simultaneously.
4. Slug and route format for nested collections.
5. Whether collections need their own images, descriptions, credits, and external IDs in a later phase.
