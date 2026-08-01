# Contributions

## Contribution Types

| `type` | `entity_type` | Description |
| --- | --- | --- |
| `create_fiction` | `fiction` | New fiction for the catalog |
| `create_place` | `place` | New place linked to a fiction |
| `add_scene` | `scene` | New scene tied to a place on the map |
| `add_photo` | `fiction` / `place` | Replace the cover on a published fiction or the photo on a place |
| `add_place_to_scene` | `scene` | Link one existing place to an existing scene (same fiction); 1 FPP each |
| `enrich_entity` | `fiction` / `place` | Extra context on an existing page |
| `correct_data` | `fiction` / `place` | Fix titles, coordinates, or facts |
| `mark_inaccessible` | `place` | Spot closed or no longer visitable |
| `add_tip` | `place` | Visitor tips: access, hours, etiquette |
| `checkin` | `city` / `place` | Log a visit to a city or place |

## Contracts

### `isCreateContributionType`

The `isCreateContributionType` contract determines whether a contribution type is considered a "create" operation. When a contribution of this type is approved, the system applies the `ENTITY_PATCH_ON_CONTRIBUTION_APPROVE` (e.g. `status: approved`, `active: true`) to the underlying entity row.

Currently, the following types are considered create operations:
- `create_fiction`
- `create_place`
- `add_scene`

`add_place_to_scene` is **not** a create type. One contribution = one place link. The contribute
wizard may submit several places at once (one contribution each). On approve it inserts into
`scene_places` from `contribution_pending_scene_places` staging (like `add_photo` promotes pending
images). The scene row’s `status` / `active` are left unchanged.

This is implemented in `src/contributions/infrastructure/supabase/contribution.repository.impl.ts`.
