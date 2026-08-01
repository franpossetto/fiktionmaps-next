# Plan: migrate `scenes.place_id` (1:1) to `scene_places` (N:M)

Status: decisions D1–D7 confirmed (§7). Ready to execute. Migrations are **generated only**,
never applied by the agent.

## Goal

A scene may span several places (a driving scene crossing a city), while the common
single-place case stays ergonomic. `scenes.place_id` is replaced by a `scene_places`
join table carrying order and playback window.

Out of scope (explicit): new UI for managing multi-place scenes, and `scenes.timestamp_label`
(unrelated field, untouched).

Shape of the writes, per D5: **creating a scene and linking a place are two separate
operations.** A scene is created with zero places; each place link is its own atomic insert.
No RPC, no multi-statement pseudo-transaction.

---

## 1. Discovery result

### 1.1 Database

| Object | File | Note |
|--------|------|------|
| `scenes.place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE` | `supabase/migrations/021_scenes_table.sql` | deleting a place today **deletes its scenes** |
| `idx_scenes_place_id`, `idx_scenes_place_sort` | 021 | dropped implicitly with the column |
| `scenes_place_matches_fiction()` + `trg_scenes_place_matches_fiction` | 021 | enforces "place belongs to the scene's fiction"; trigger is `BEFORE INSERT OR UPDATE OF place_id, fiction_id` |
| `scenes` RLS: SELECT by `status` / creator / staff; INSERT authenticated (pending forced for non-staff); UPDATE/DELETE staff-only | 022, 034, 041, 057 | `FORCE ROW LEVEL SECURITY` is on |
| `handle_updated_at()` + `set_scenes_updated_at` | 021 | reusable `updated_at` convention |
| `Database["public"]["Tables"]["scenes"]` | `supabase/database.types.ts` L431–505 | **hand-maintained** (`npm run gen:types` needs a local Supabase) |

No SQL view, RPC or cluster function references `scenes` (checked `059`–`062`
`map_place_clusters*`), so the map cluster path is unaffected.

### 1.2 Domain / application

| File | What references the 1:1 place |
|------|------------------------------|
| `src/scenes/domain/scene.entity.ts` | `Scene.placeId: string`, `Scene.locationId: string` (denormalized from `places.location_id`); `ProfileScenePreview.placeId` |
| `src/scenes/domain/scene.schemas.ts` | `createSceneBodySchema.placeId` (required uuid), `patchSceneBodySchema.placeId` (optional uuid) → `CreateSceneData` / `UpdateSceneData` |
| `src/scenes/domain/scene.repository.ts` | `SceneListFilters.placeId`, `SceneListFilters.locationId`, `getByPlaceId`, `getByLocationId`, `getByFictionId`, `getAll` |
| `src/scenes/application/get-scene-watch-bundle.usecase.ts` | `getPlaceById(scene.placeId)` → single `place` in the bundle |
| `src/places/application/get-map-location-panel.usecase.ts` | `listActiveScenesForPlace(placeId)` (port shape only, no change) |

### 1.3 Infrastructure (Supabase adapter) — `src/scenes/infrastructure/supabase/scene.repository.impl.ts`

Every read path pivots on `place_id`:

- `sceneSelect` (L61–78) embeds `places!inner (location_id)`; `mapRow` (L34–58) flattens it into `Scene.locationId`.
- `listScenesWithClient` (L156–191): `.eq("place_id", …)` for `filters.placeId`, `.in("place_id", …)` for `filters.locationId`.
- `getAll` / `getByLocationId` / `getByFictionId` / `getByPlaceId` (L327–402).
- `create` (L414–440) inserts `place_id`; `update` (L442–478) patches `place_id`.
- `fetchScenesWithVideoForPlaceIds` (L224–324): denormalized read model for the **city clip
  carousel** — returns `Place[]` where `id` is the *scene* id and the place fields come from the
  join. See §1.7 for its real call graph; it is **not** the pin-click path.
- `listCitiesWithActiveScenes` (L515–574): embed `places!inner (locations!inner (city_id))`.
- `listFictionIdsWithScenesInCity` (L576–623), `listScenesWithVideoInBbox` (L625–662), `listScenesWithVideoInCity` (L664–701): resolve `locations → places → .in("place_id", ids)`.
- `getScenesCreatedByUserId` (L703–759): selects `place_id` for `ProfileScenePreview`.

### 1.4 Entry points (`infrastructure/next`)

- `scene.actions.ts`: `listScenesAction` (placeId + locationId filters), `createSceneAction`, `updateSceneAction`, `deleteSceneAction`, viewer actions.
- `scene.queries.ts`: `getScenesForPlaceCached` (tag `place-${placeId}`), `getScenesForFictionCached`, `getScenesForCityCached`, `getSceneByIdCached`.
- `scene.form-parsers.ts`: `listScenesQuerySchema.placeId` / `.locationId`.
- `scene.actions.types.ts`: `ListScenesQueryInput.placeId` / `.locationId`.
- `src/places/infrastructure/next/place.actions.ts` L158–168: `getMapLocationPanelAction` wires `listActiveScenesForPlace: getScenesForPlace`.

There are **no route handlers** — the repo has no `app/api/**` and no `route.ts`. The
`POST /api/scenes` / `PATCH /api/scenes/[id]` comments in `scene.schemas.ts` are stale;
the only writers are the two server actions. That means **no external API contract to keep**.

### 1.5 UI

| File | Usage |
|------|-------|
| `components/admin/scenes-tab.tsx` | create wizard: step 2 picks exactly one place (`handleSelectPlace`, L219); list/search resolve `places.find(p => p.placeId === scene.placeId)` (L115, L292); payload sends `placeId` (L167) |
| `components/admin/scene-edit-view.tsx` | `sceneToForm` reads `scene.placeId` (L52), place shown as a read-only chip, but `updateSceneAction` still **re-sends** `placeId` (L140) |
| `components/scenes/scene-up-next-deferred.tsx` | `fictionScenes.map(s => s.placeId)` (L38) to batch-fetch places |
| `components/scenes/scene-up-next-aside.tsx` | `buildSceneLocationsMap` keys by `scene.placeId` / `scene.locationId` (L11–21, L105) |
| `components/layout/app-top-navbar.tsx` | place-scoped search: `scenes.filter(s => s.placeId === scope.placeId)` (L175) and `listScenesAction({ placeId })` (L213) |
| `app/[locale]/(app)/fictions/[slug]/scenes/[sceneId]/page.tsx` | `primaryPlaceId={scene.placeId}` (L99); breadcrumb from `bundle.place` |
| `components/scenes/scene-viewer.tsx` | city clip carousel over the `Place[]` read model; `id` = scene id, used at L349 (`<video>` remount key) and L438 (progress dots key) |
| `components/fictions/place-detail-deferred.tsx`, `components/map/location-detail.tsx` | scoped by `placeId` **prop** — no change needed |
| `components/profile/profile-sidebar-sections.tsx` | `ScenesSection` ignores `ProfileScenePreview.placeId` |

`contribute/scene/page.tsx` is a "coming soon" stub — nothing to migrate.

### 1.6 Dead code found (do not migrate — delete)

Confirmed zero callers (verify with `npx knip` before deleting):

- `ScenesRepositoryPort.getAll`, `.getByLocationId`, `.getByFictionId`, `.getByPlaceId` and their four adapter implementations. All live reads go through `list(filters)`.
- `SceneListFilters.locationId` + `listScenesQuerySchema.locationId` + `ListScenesQueryInput.locationId` — no caller ever passes `locationId`.
- `ProfileScenePreview.placeId` — unused by `ScenesSection`.
- **The whole bbox branch**: `listScenesWithVideoInBbox` (port + adapter),
  `list-scenes-in-bbox.usecase.ts`, and the `"bbox" in opts` branch of `listScenesForViewerAction`.
  `scene-viewer.tsx` is the only consumer of that action and always passes `{ cityId }`; the map
  page uses `listMapPlacesInBboxCached` (places), not scenes.

Removing these deletes ~120 lines that would otherwise each need a `scene_places` rewrite.

### 1.7 Call graph of the `Place[]` read model (settles D6)

```
/scenes page → SceneViewer (L124)  ─┐
                                    ├→ listScenesForViewerAction → listScenesInCityUseCase ─┐
watch page → scene-up-next-deferred ┘                                                       │
              → getScenesForCityCached (scene.queries.ts L110) ─────────────────────────────┤
                                                                                            ↓
                                                            listScenesWithVideoInCity → fetchScenesWithVideoForPlaceIds
```

Both consumers are **city-wide clip lists**, not per-pin lists. The pin-click path is separate
and returns `Scene[]`:

```
location-detail.tsx → loadMapLocationPanel(place.id) → getMapLocationPanelAction
  → getScenesForPlaceCached(placeId) → listScenesUseCase({placeId, active:true}) → list()
```

So the map pin panel is governed by the `list({placeId})` rewrite (P12), and D6 only decides
what the *carousel* does with a multi-place scene.

---

## 2. Problems found in the incoming spec

Each is a correctness or availability bug; the resolution is folded into §4–§6.

### P1 — Dropping `place_id` breaks *all* scene writes (blocker)

`scenes_place_matches_fiction()` body reads `NEW.place_id`, and its trigger fires on
`BEFORE INSERT OR UPDATE OF place_id, fiction_id`. Dropping the column leaves `fiction_id`
in the column list, so the trigger survives and every `INSERT`/`UPDATE` on `scenes` fails at
runtime with `record "new" has no field "place_id"`. The trigger and function must be dropped
explicitly — and per P1b, **in `063`, not `064`**.

### P1b — D5 pulls that drop forward into the expand migration

Because a scene is now created with **no** place, the new adapter inserts `scenes` rows with
`place_id = NULL` while `063` is applied but `064` is not. The old 021 trigger fires
`BEFORE INSERT`, its `EXISTS (… WHERE p.id = NEW.place_id …)` finds nothing, and it raises.
So `063` must drop `trg_scenes_place_matches_fiction` + `scenes_place_matches_fiction()`;
`064` is then only `DROP COLUMN`. Missing this makes every scene creation fail the moment the
new code deploys.

### P1c — `!inner` on the embed makes a place-less scene unreadable

`create` finishes with `fetchSceneById`, which uses `sceneSelect`. If that select keeps
`scene_places!inner`, a scene with zero places returns no row → `create` returns `null` →
`createSceneUseCase` throws "Failed to create scene" even though the insert succeeded. Under
D5 every scene is momentarily place-less, so `getById` **must** use a left-join embed. Keep
`!inner` only on the public list paths, where a place-less draft should stay hidden (§6.5).

### P2 — The fiction-consistency invariant disappears

The 021 trigger is the only thing guaranteeing "a scene's place belongs to the scene's
fiction". The spec has no replacement. Needs two triggers: one on `scene_places` (INSERT/UPDATE)
and one on `scenes` (`UPDATE OF fiction_id`) that re-validates existing rows — the admin edit
form does send `fictionId` on every save.

### P3 — No RLS, no GRANTs

Every business table here is `ENABLE`d + `FORCE`d RLS with explicit grants (021/022/034/041/057).
The spec omits both. Without a policy the table is deny-all and every scene read returns
empty; without RLS at all, pending scenes' place links leak. Policy must mirror `scenes`
visibility, which is cheapest expressed as `EXISTS (SELECT 1 FROM public.scenes s WHERE s.id = scene_id)`
— `scenes`' own SELECT policy already filters approved/creator/staff, and RLS applies inside
policy subqueries, so visibility stays in one place.

### P4 — Missing index on `place_id`

The spec indexes `(scene_id, sort_order)` and uniques `(scene_id, place_id)`. Neither can
serve the **hottest** query in the app — "scenes at this place" (map sidebar panel, place
detail page, place-scoped search). Add `(place_id, scene_id)`.

### P5 — `ON DELETE` unspecified

Both FKs need `ON DELETE CASCADE`. Note this changes behaviour: today deleting a place
cascade-deletes its scenes; from now on it only removes the link (D3 accepts the resulting
invisible orphan).

### P6 — `UNIQUE (scene_id, place_id)` contradicts `start_second`/`end_second`

Time windows imply a place can be revisited within one scene (drive out and back). The unique
constraint forbids a second interval for the same place. Kept for v1 per D4.

### P7 — Non-deterministic order

`sort_order` defaults to `0` with no uniqueness per scene, so several links can share `0`.
Every `ORDER BY sort_order` needs a tiebreaker (`created_at, id`), and the link operation
should assign `max(sort_order) + 1` (§6.5).

### P8 — No CHECK constraints

`021` guards `season > 0`, `episode > 0`, `sort_order >= 0`. Mirror that: `sort_order >= 0`,
`start_second >= 0`, `end_second >= start_second`.

### P9 — "non-null `place_id`" is vacuous

`scenes.place_id` is `NOT NULL` today, so the backfill covers 100% of rows. The backfill must
also be **idempotent** (`ON CONFLICT DO NOTHING`) because migrations are applied manually and
may be re-run.

### P10 — Single migration = deploy outage

If one migration creates the table and drops the column, then between applying SQL and
deploying code, running production code selecting `place_id` breaks (and vice versa). Split
into expand → deploy → contract, with `place_id` made **nullable** in the expand step. See §3.

### P11 — Scene creation is no longer a single insert

Resolved by decomposition rather than by a transaction (D5): `createScene` writes only the
`scenes` row, and `linkScenePlace` is a separate one-statement insert. Each operation is
atomic on its own. The residual failure mode — create succeeds, link fails — leaves a scene
with zero places, which every list path hides via `!inner` (P1c). The admin wizard must
surface that error so staff can retry the link. RLS note: `scene_places` INSERT must admit the
scene's creator, because a contributor's scene is still `pending` and `scenes` UPDATE/DELETE
is staff-only (057), so nothing can be compensated for from the client.

### P12 — PostgREST filter-on-embedded truncates the embed

`.select("…, scene_places!inner(place_id)").eq("scene_places.place_id", X)` returns the parent
scene but the embedded array contains **only** the matching place. So "list scenes at place X,
each with all of its places" cannot be one query. Use two steps: ids from `scene_places`, then
`.in("id", ids)` with the full embed.

### P13 — `Scene.locationId` has no single value any more

It is denormalized from the one place. With N places it becomes per-place data (`ScenePlace.locationId`).

### P14 — The `Place[]` read model collides on `id`

`id` is the **scene** id but the row is per-place, so one row per (scene, place) pair would
duplicate React keys at `scene-viewer.tsx` L349/L438. Resolved by D6: one row per scene.

---

## 3. Migration strategy: expand → deploy → contract

Three ordered steps. Steps 1 and 3 are `.sql` files the user applies manually; step 2 is the
code deploy.

1. **`063_scene_places_table.sql`** — create `scene_places` (+ indexes, CHECKs, RLS, grants,
   triggers), backfill from `scenes.place_id`, `ALTER COLUMN place_id DROP NOT NULL`, and drop
   the old `place_id` fiction trigger + function (P1b).
2. **Code deploy** — all reads/writes go through `scene_places`; nothing reads or writes
   `scenes.place_id`.
3. **`064_scenes_drop_place_id.sql`** — drop the column (its two indexes and the FK go with it).

Rollback before step 3 = revert the code deploy; the column is still there and populated (but
newly created scenes have `place_id = NULL`, so the reverted code would not show them — note
this in the header). After step 3, rollback requires re-adding the column and backfilling from
`scene_places`.

`supabase/database.types.ts` is hand-maintained and must be edited alongside **both** SQL steps:
add the `scene_places` table entry (Row/Insert/Update/Relationships) and make
`scenes.place_id` nullable in step 1; remove `place_id` from `scenes` Row/Insert/Update and
drop the `scenes_place_id_fkey` relationship in step 3.

---

## 4. Migration 063 — `scene_places` (expand)

```sql
-- scene_places: a scene may span several places (N:M), ordered, with an optional
-- playback window inside the scene's video. Replaces scenes.place_id (dropped in 064).

CREATE TABLE IF NOT EXISTS public.scene_places (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  scene_id      UUID        NOT NULL REFERENCES public.scenes (id) ON DELETE CASCADE,
  place_id      UUID        NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  start_second  INTEGER,
  end_second    INTEGER,
  created_by    UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT scene_places_pkey PRIMARY KEY (id),
  CONSTRAINT scene_places_scene_place_unique UNIQUE (scene_id, place_id),
  CONSTRAINT scene_places_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT scene_places_start_second_non_negative CHECK (start_second IS NULL OR start_second >= 0),
  CONSTRAINT scene_places_end_after_start CHECK (
    end_second IS NULL OR start_second IS NULL OR end_second >= start_second
  )
);

CREATE INDEX IF NOT EXISTS idx_scene_places_scene_sort
  ON public.scene_places (scene_id, sort_order, created_at);
-- P4: "scenes at this place" is the hottest lookup (map panel, place detail, place search).
CREATE INDEX IF NOT EXISTS idx_scene_places_place
  ON public.scene_places (place_id, scene_id);

DROP TRIGGER IF EXISTS set_scene_places_updated_at ON public.scene_places;
CREATE TRIGGER set_scene_places_updated_at
  BEFORE UPDATE ON public.scene_places
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 4.1 Fiction-consistency triggers (P2)

```sql
-- A linked place must belong to the same fiction as the scene.
CREATE OR REPLACE FUNCTION public.scene_places_place_matches_scene_fiction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.places p
    JOIN public.scenes s ON s.id = NEW.scene_id
    WHERE p.id = NEW.place_id
      AND p.fiction_id = s.fiction_id
  ) THEN
    RAISE EXCEPTION 'scene_places: place_id must reference a place for the scene''s fiction_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scene_places_place_matches_fiction ON public.scene_places;
CREATE TRIGGER trg_scene_places_place_matches_fiction
  BEFORE INSERT OR UPDATE OF scene_id, place_id ON public.scene_places
  FOR EACH ROW
  EXECUTE FUNCTION public.scene_places_place_matches_scene_fiction();

-- Moving a scene to another fiction must not orphan its existing place links.
CREATE OR REPLACE FUNCTION public.scenes_fiction_change_matches_places()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fiction_id IS DISTINCT FROM OLD.fiction_id AND EXISTS (
    SELECT 1
    FROM public.scene_places sp
    JOIN public.places p ON p.id = sp.place_id
    WHERE sp.scene_id = NEW.id
      AND p.fiction_id <> NEW.fiction_id
  ) THEN
    RAISE EXCEPTION 'scenes: fiction_id change conflicts with linked scene_places';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scenes_fiction_change_matches_places ON public.scenes;
CREATE TRIGGER trg_scenes_fiction_change_matches_places
  BEFORE UPDATE OF fiction_id ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.scenes_fiction_change_matches_places();
```

`SECURITY DEFINER` matches the 034/041 helper convention and avoids the trigger being
blocked by RLS on `places` / `scenes` for the inserting role.

### 4.2 RLS + grants (P3)

```sql
ALTER TABLE public.scene_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_places FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_places TO anon, authenticated;

-- Visibility is delegated to scenes' own SELECT policy (approved / creator / staff, 034):
-- RLS applies inside this subquery, so there is a single source of truth.
DROP POLICY IF EXISTS "scene_places: select when scene visible" ON public.scene_places;
CREATE POLICY "scene_places: select when scene visible"
  ON public.scene_places
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.scenes s WHERE s.id = scene_id));

-- P11: a contributor must be able to link a place to the scene they just created (still
-- pending). Staff may link on any scene.
DROP POLICY IF EXISTS "scene_places: insert own scene or staff" ON public.scene_places;
CREATE POLICY "scene_places: insert own scene or staff"
  ON public.scene_places
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_profile()
    OR EXISTS (
      SELECT 1 FROM public.scenes s
      WHERE s.id = scene_id
        AND s.created_by = (SELECT auth.uid())
    )
  );

-- Mirrors 057: only staff mutate/remove links on existing scenes.
DROP POLICY IF EXISTS "scene_places: staff can update" ON public.scene_places;
CREATE POLICY "scene_places: staff can update"
  ON public.scene_places
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "scene_places: staff can delete" ON public.scene_places;
CREATE POLICY "scene_places: staff can delete"
  ON public.scene_places
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
```

### 4.3 Backfill, relax `place_id`, retire the old trigger (P9, P10, P1b)

```sql
INSERT INTO public.scene_places (scene_id, place_id, sort_order, start_second, end_second, created_by)
SELECT s.id, s.place_id, 0, NULL, NULL, s.created_by
FROM public.scenes s
WHERE s.place_id IS NOT NULL
ON CONFLICT (scene_id, place_id) DO NOTHING;

-- Lets the new code insert scenes with no place before 064 drops the column.
ALTER TABLE public.scenes ALTER COLUMN place_id DROP NOT NULL;

-- P1b: superseded by trg_scene_places_place_matches_fiction. Must go NOW, not in 064: its
-- function raises on any INSERT with a NULL place_id, which is exactly what the new
-- createScene does.
DROP TRIGGER IF EXISTS trg_scenes_place_matches_fiction ON public.scenes;
DROP FUNCTION IF EXISTS public.scenes_place_matches_fiction();
```

Post-apply sanity queries to include in the file as comments:

```sql
-- SELECT count(*) FROM public.scenes;                                    -- expect N
-- SELECT count(*) FROM public.scene_places;                              -- expect N
-- SELECT count(*) FROM public.scenes s
--   LEFT JOIN public.scene_places sp ON sp.scene_id = s.id
--   WHERE sp.id IS NULL;                                                 -- expect 0
```

## 5. Migration 064 — drop `scenes.place_id` (contract)

Apply only after the code deploy is live and QA (§9) passes.

```sql
-- Superseded by scene_places (063). The trigger and function that read NEW.place_id were
-- already dropped in 063. Dropping the column also drops scenes_place_id_fkey,
-- idx_scenes_place_id and idx_scenes_place_sort.
ALTER TABLE public.scenes DROP COLUMN IF EXISTS place_id;
```

Per D3, there is **no** orphan-cleanup trigger: deleting a place removes only the link, and a
scene left with zero places stays in the table but is invisible everywhere (all list paths
inner-join `scene_places`). That is accepted, and it is also what makes the P11 failure mode
harmless.

---

## 6. Code layer

### 6.1 `domain/scene.entity.ts`

```ts
/** One place a scene passes through, with its window inside the scene's video. */
export interface ScenePlace {
  placeId: string
  /** Denormalized from `places.location_id` for map views. */
  locationId: string
  sortOrder: number
  startSecond: number | null
  endSecond: number | null
}

export interface Scene {
  id: string
  fictionId: string
  /** Ordered by `sortOrder`, then `created_at`. Empty only for a scene with no links yet. */
  places: ScenePlace[]
  // …unchanged fields; `placeId` and `locationId` removed
}
```

Drop `ProfileScenePreview.placeId` (unused, §1.6).

### 6.2 New `domain/scene.helpers.ts`

Follows the existing `hunt-place.helpers.ts` convention and keeps UI churn to one-liners:

```ts
export function primaryScenePlace(scene: Scene): ScenePlace | null
export function scenePlaceIds(scene: Scene): string[]
export function sceneIncludesPlace(scene: Scene, placeId: string): boolean
```

### 6.3 `domain/scene.schemas.ts`

Per D5 + D7, scene write schemas stop carrying places altogether:

- `createSceneBodySchema`: **remove** `placeId`, add nothing in its place. `CreateSceneData` no
  longer has any place field.
- `patchSceneBodySchema`: **remove** `placeId`. Scene updates never touch links.
- New `linkScenePlaceBodySchema`: `{ sceneId: uuid, placeId: uuid, startSecond?: int|null,
  endSecond?: int|null }`, with the same `end >= start` refinement as the DB CHECK so the error
  is a validation message rather than a Postgres exception. `sortOrder` is **not** accepted from
  the client — the adapter assigns it (P7).
- Fix the stale `POST /api/scenes` / `PATCH /api/scenes/[id]` doc comments to name the actions.

### 6.4 `domain/scene.repository.ts`

- `SceneListFilters`: keep `placeId` (now means "scene includes this place"), **delete** `locationId`.
- **Delete** `getAll`, `getByLocationId`, `getByFictionId`, `getByPlaceId`, `listScenesWithVideoInBbox` (§1.6).
- **Add** `linkPlace(input: LinkScenePlaceData & { createdBy: string | null }): Promise<ScenePlace | null>`.
- Do **not** add `unlinkPlace` / `reorderPlaces` yet: nothing calls them until the multi-place
  UI lands, and `knip` would flag them as dead.
- `create` / `update` / `list` / `getById` signatures unchanged.

### 6.5 `infrastructure/supabase/scene.repository.impl.ts`

Two selects instead of one (P1c):

```ts
// getById — LEFT join: a freshly created, still place-less scene must be returned.
const sceneSelectWithPlaces = `
  id, fiction_id, title, description, quote, timestamp_label,
  season, episode, episode_title, video_url, sort_order, active,
  scene_places (
    place_id, sort_order, start_second, end_second,
    places!inner ( location_id )
  )
`
// list — INNER join: hides place-less drafts and scenes whose place is pending/deleted,
// matching today's behaviour.
const sceneSelectWithPlacesRequired = sceneSelectWithPlaces.replace("scene_places (", "scene_places!inner (")
```

Write the two constants out explicitly rather than with `.replace` — that line is illustrative.

`mapRow` builds `places: ScenePlace[]`, **sorted in JS** by `(sortOrder, then original row
order)`. Do not rely on PostgREST `referencedTable` ordering, and remember P7's tiebreaker.

- `list(filters)` (P12): if `filters.placeId`, first `select("scene_id").eq("place_id", …)` from
  `scene_places`, then `.in("id", sceneIds)` with `sceneSelectWithPlacesRequired`. Never filter
  `scene_places.place_id` inside the embed — it truncates the returned place list.
- `create`: unchanged except it no longer inserts `place_id`, and it finishes with the
  left-join `fetchSceneById`.
- `update`: unchanged except the `place_id` patch line is deleted. No link handling at all.
- `linkPlace`: read `max(sort_order)` for the scene, insert with `sort_order = max + 1` (or `0`
  when none), return the mapped `ScenePlace`. Concurrent links can pick the same value; that is
  tolerable given P7's tiebreaker and D4's uniqueness on `(scene_id, place_id)`. Surface the
  unique-violation code (`23505`) as a distinct "already linked" error.
- `fetchScenesWithVideoForPlaceIds` (D6): embed
  `scene_places!inner ( place_id, sort_order, places!inner ( id, name, slug, location_id, locations!inner (…) ) )`,
  then emit **one `Place` row per scene**, choosing the lowest-`sort_order` place among those in
  the requested `placeIds`. `id` stays the scene id → no key collisions, no duplicated clips in
  the carousel, zero UI change.
- `listCitiesWithActiveScenes`: embed becomes
  `scene_places!inner ( places!inner ( locations!inner ( city_id ) ) )`; the flattening loop
  iterates the array instead of taking `[0]`. Semantics intentionally become "a scene counts for
  a city if **any** of its places is there".
- `listFictionIdsWithScenesInCity`, `listScenesWithVideoInCity`: the `locations → places →
  placeIds` prelude is unchanged; the final hop pivots through `scene_places` instead of
  `scenes.place_id`. The `.in()` arrays do not grow, only the hop count does.
- `getScenesCreatedByUserId`: drop `place_id` from the select.
- Delete the dead methods from §1.6. `scenesRepoPublic` (`Pick<…, "getById" | "list">`) is unchanged.

### 6.6 `application/`

- **New** `link-scene-place.usecase.ts`: validate the scene exists (`getById`), then
  `repo.linkPlace(...)`. The fiction match is enforced by the DB trigger; surface its error.
- `create-scene.usecase.ts`: unchanged (the fiction-type guard still applies).
- `update-scene.usecase.ts`: unchanged.
- `get-scene-watch-bundle.usecase.ts`: resolve **all** places
  (`getPlacesByIds(scenePlaceIds(scene))`) and return `{ fiction, scene, place, places }`, where
  `place` is the primary (`sortOrder` 0) so the existing breadcrumb keeps compiling. Validation
  changes from "the place belongs to the fiction" to "**at least one** place belongs to the
  fiction, and only those are returned"; return `null` when none do — which also 404s a
  place-less draft. Deps gain `getPlacesByIds: (ids: string[]) => Promise<Place[]>`;
  `getPlaceLocationsByIdsCached` in `place.queries.ts` is the natural injection.
- **Delete** `list-scenes-in-bbox.usecase.ts` (§1.6).
- `get-map-location-panel.usecase.ts`: unchanged (place-scoped port).

### 6.7 `infrastructure/next/`

- `scene.form-parsers.ts` / `scene.actions.types.ts`: drop `locationId`; keep `placeId` (filter).
  Add `LinkScenePlaceResult` to `scene.actions.types.ts`.
- `scene.actions.ts`:
  - drop the `locationId` plumbing and the `"bbox" in opts` branch of `listScenesForViewerAction`;
  - **new** `linkScenePlaceAction(body: unknown): Promise<LinkScenePlaceResult>` — `auth.getUser()`,
    parse with `linkScenePlaceBodySchema`, call the use case. Authorization mirrors the RLS
    policy: allow staff, or the scene's own `created_by` (so the create wizard works for
    contributors); let RLS be the backstop;
  - after create / update / link, invalidate the affected place tags, not just
    `updateTag("scenes")`: `updateTag("places")` plus `updateTag(\`place-${id}\`)` for the places
    involved. Otherwise `getScenesForPlaceCached` (tag `place-${placeId}`) can serve a stale list.
    (`"scenes"` alone happens to cover it today because those entries carry both tags; be
    explicit rather than relying on it.)
- `scene.queries.ts`: no signature change. `getScenesForPlaceCached(placeId)` now returns scenes
  that *include* the place.

### 6.8 UI (compile-and-behave only, no new UI)

| File | Change |
|------|--------|
| `components/admin/scenes-tab.tsx` | `handleSubmit` drops `placeId` from the create payload, then on success calls `linkScenePlaceAction({ sceneId: result.scene.id, placeId: formData.placeId })`; if the link fails, show the error and keep the wizard open instead of navigating away (P11). List/search lookups use `primaryScenePlace(scene)?.placeId`. The wizard still picks exactly one place. |
| `components/admin/scene-edit-view.tsx` | `sceneToForm` uses `primaryScenePlace(scene)?.placeId ?? ""` for the read-only chip; **remove `placeId` from the save payload** and drop it from `validateForm` (D7). |
| `components/scenes/scene-up-next-deferred.tsx` | `fictionScenes.flatMap(scenePlaceIds)` instead of `.map(s => s.placeId)` |
| `components/scenes/scene-up-next-aside.tsx` | `buildSceneLocationsMap` iterates `scene.places`; label uses the primary place's name |
| `components/layout/app-top-navbar.tsx` | `scenes.filter(s => sceneIncludesPlace(s, scope.placeId))` |
| `app/[locale]/(app)/fictions/[slug]/scenes/[sceneId]/page.tsx` | `primaryPlaceId={bundle.place.id}` |
| `components/scenes/scene-viewer.tsx` | **no change** (D6 keeps one row per scene) |

---

## 7. Decisions — confirmed

| # | Decision | Consequence in this plan |
|---|----------|--------------------------|
| **D1** | Two migrations: `063` expand, `064` contract. | §3, §4, §5. |
| **D2** | `scene_places` carries `created_by` + `updated_at`. | §4 columns + `set_scene_places_updated_at` trigger; backfill copies `scenes.created_by`; `linkPlace` sets `created_by`. |
| **D3** | Deleting a place does **not** delete the scene; an orphan scene stays invisible. | No orphan-cleanup trigger (§5). Also removes the insert-before-delete ordering constraint, and makes the P11 failure mode harmless. |
| **D4** | `UNIQUE (scene_id, place_id)` stays for now, relaxable later. | §4. Forbids two time windows for the same place (P6); becomes `(scene_id, place_id, sort_order)` when revisits are needed. |
| **D5** | Creating a scene is an isolated act (no places); linking a place is a separate atomic action. **No RPC.** | Drives §6.3 (schemas carry no places), §6.4 (`linkPlace` port), §6.6 (new use case), §6.7 (new action), §6.8 (wizard calls two actions). Surfaces **P1b** (old trigger must be dropped in `063`) and **P1c** (`getById` needs a left join). |
| **D6** | The city read model emits **one row per scene**, using the primary place. | §6.5. `fetchScenesWithVideoForPlaceIds` feeds the `/scenes` city carousel and the watch-page city rail (§1.7) — not the pin panel — so a per-pair row would repeat the same clip in the carousel. Zero UI change, no key collisions. Per-pin multi-place behaviour already works through `list({placeId})`. The dead bbox branch is deleted, which also removes the "wrong coordinates" concern. |
| **D7** | The scene edit form omits `placeIds`; existing links are untouched. | §6.3 removes `placeId` from `patchSceneBodySchema` entirely, §6.8 removes it from the payload. |

---

## 8. Execution order

Six batches. **Every batch ends with `npx tsc --noEmit` and `npm run lint` green** — no batch
leaves the tree broken. That is possible only because batch 3 keeps `Scene.placeId` alive as a
temporary derived field and batch 5 deletes it; without that, batches 3–5 would collapse into
one ~10-file change with a red type-check from the first edit to the last.

Assumption: batches are commits on one branch with a **single code deploy** after batch 5. So an
intermediate batch only has to compile, not to be runtime-consistent. If any batch is deployed
on its own, re-read the note on batch 3.

### Batch 1 — SQL + generated types

`supabase/migrations/063_scene_places_table.sql` (§4) and the `database.types.ts` edit
(add `scene_places`, make `scenes.place_id` optional in `Insert`/`Update`).
No application code changes; nothing imports the new table yet.

Gate: user reviews the SQL, applies `063` to local/staging, runs the three sanity queries in §4.3.
The table must exist before batch 3 can be smoke-tested.

### Batch 2 — dead-code removal (independent, do it before the model change)

Pure deletions from §1.6: the four unused port methods + adapter implementations, the whole bbox
branch (port, adapter, `list-scenes-in-bbox.usecase.ts`, the `"bbox" in opts` action branch),
`SceneListFilters.locationId` and its two mirrors, `ProfileScenePreview.placeId`.

Gate: `npx knip` clean, `tsc` green. This shrinks batch 3 by ~120 lines and removes four methods
that would otherwise each need an embed rewrite.

### Batch 3 — read path (domain + adapter)

`scene.entity.ts` gains `ScenePlace` + `places: ScenePlace[]`; new `scene.helpers.ts`; adapter
gets the two selects (`sceneSelectWithPlaces` left-join for `getById`, inner-join for `list`),
the new `mapRow`, the two-step `list({placeId})`, and the four rewritten readers
(`fetchScenesWithVideoForPlaceIds`, `listCitiesWithActiveScenes`,
`listFictionIdsWithScenesInCity`, `listScenesWithVideoInCity`, plus `getScenesCreatedByUserId`).

**Keep `placeId` and `locationId` on `Scene`**, populated by `mapRow` from the primary place, and
mark them `@deprecated`. Consumers stay untouched and green. `create`/`update` still write
`scenes.place_id` in this batch.

If this batch were deployed alone it would be runtime-inconsistent (a newly created scene would
write `place_id` but no `scene_places` row, making it invisible). Deploy only after batch 4.

Gate: `tsc` green with zero consumer edits; smoke-test reads against the migrated local DB
(admin list, place detail, watch page, `/scenes` carousel, map pin panel).

### Batch 4 — write path

`scene.schemas.ts` drops `placeId` from create and patch and adds `linkScenePlaceBodySchema`;
port gains `linkPlace`; adapter implements it (with the `max(sort_order) + 1` assignment and the
`23505` "already linked" mapping) and stops writing `place_id`; new
`link-scene-place.usecase.ts`; new `linkScenePlaceAction` + tag invalidation in `scene.actions.ts`;
`scenes-tab.tsx` calls create-then-link; `scene-edit-view.tsx` drops `placeId` from its payload.

Gate: create a scene through the admin wizard against the local DB and confirm both rows land;
force the link to fail and confirm the error surfaces and the draft stays hidden.

### Batch 5 — consumers + compat cleanup

`get-scene-watch-bundle.usecase.ts` resolves all places; the five remaining UI files in §6.8 move
to `scene.places` / the helpers; then **delete `placeId` and `locationId` from `Scene`** and the
lines in `mapRow` that filled them.

Gate: `tsc`, `lint`, `knip` green; full QA §9. Then deploy.

### Batch 6 — contract

`supabase/migrations/064_scenes_drop_place_id.sql` (§5) + the matching `database.types.ts` edit
(remove `place_id` from `scenes` Row/Insert/Update and drop `scenes_place_id_fkey`).

Gate: applied by the user only after batch 5 is live and QA passed.

### Wrap-up

Fold the durable model decisions into `docs/reference/` (extend `places-and-locations.md` with a
scenes ↔ places section) and delete this plan, per `AGENTS.md`.

## 9. QA checklist (after 063 + code deploy)

- Admin → Scenes: list renders with fiction + place labels; search by place name works.
- Admin → create scene wizard end-to-end, with and without a video upload. Confirm **two**
  writes land: the `scenes` row and its `scene_places` row.
- Force the link step to fail (e.g. link an already-linked place): the wizard shows the error
  and the half-created scene does **not** appear in any public list.
- Admin → `/admin/scene/[id]`: save; the link set is unchanged (D7) and `updated_at` on
  `scene_places` is untouched.
- Public watch page `/fictions/[slug]/scenes/[sceneId]`: breadcrumb place, up-next rail (same
  fiction + same city), metadata/OG image.
- Place detail `/fictions/[slug]/places/[placeId]`: scene list present.
- Map: click a pin → sidebar panel lists the place's scenes; `/scenes` city carousel plays clips
  with no duplicated entries.
- Navbar search scoped to a place returns that place's scenes.
- Profile sidebar → Scenes section still links correctly.
- Contributor (non-staff) creates a scene **and** links a place → both rows exist, scene is
  `pending` + inactive, invisible to anon, visible to its creator.
- Manually insert a second `scene_places` row for one scene (SQL): it appears in that place's
  scene list, the watch page still shows the primary place, and the city carousel still shows
  the clip once.
- Delete a place that has scenes: the scenes survive with one fewer link and disappear from
  public lists if they had only that one (D3).
- Fiction with zero scenes and a scene whose place is pending both behave as before.
