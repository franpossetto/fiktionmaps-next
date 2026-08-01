# Plan: add place to scene contribution

Status: implemented (recommendations D1–D5). Migrations are **generated only**,
never applied by the agent.

## Goal

Let contributors propose linking an **existing approved place** to an **existing approved scene**
(same fiction), as a moderated contribution with FPP. This is the community counterpart of
admin/`linkScenePlaceAction`, and the natural follow-up to D5 in
`scene-places-many-to-many.md` (create scene and link place are separate operations).

Out of scope (v1): multi-place in one submit, unlink/reorder, editing playback windows after
approve, linking places onto the contributor’s own still-pending `add_scene` (already covered
by the scene contribute wizard).

---

## 0. Open decisions

| # | Topic | Recommendation | Alternatives |
|---|---|---|---|
| D1 | Contribution `type` | New enum value `add_place_to_scene` | Reuse `enrich_entity` (`entity_type: scene`) — cheaper migration, murkier approve branching |
| D2 | Approve semantics | Staging + link **on approve** (like `add_photo`) | Link on submit + FPP-only contribution — blocked by RLS for non-owners; reject cannot cleanly undo |
| D3 | Playback window in wizard | v1 always `start_second` / `end_second` = `null` | Optional step for start/end seconds |
| D4 | FPP | `3` (same as `enrich_entity` / `add_photo`) | Higher if product wants to incentivize multi-place enrichment |
| D5 | Staff feed placement | Include under existing kind `scene`, discriminate by `type` | Separate enrich tab |

Until confirmed, the rest of this plan assumes **D1–D5 recommendations**.

---

## 1. Discovery

### 1.1 What already exists

| Piece | Path / note |
|---|---|
| M2M join | `scene_places` (`063_scene_places_table.sql`) |
| Link use case | `src/scenes/application/link-scene-place.usecase.ts` |
| Link action (staff / scene owner) | `linkScenePlaceAction` in `scene.actions.ts` |
| `add_scene` contribute | Creates scene + links **one** place at submit; records `add_scene` |
| Approve create-types | `isCreateContributionType` → patch entity `status`/`active` |
| Staging pattern | `contribution_pending_images` + promote on approve (`add_photo`) |
| Contribute UX shell | `ContributionWizardShell`, `FictionContributeLayout`, steps/criteria/FPP/done |

### 1.2 Hard constraints

1. **`contributions` has no payload column** — only `type`, `entity_type`, `entity_id`.
   Storing the proposed `place_id` requires a staging table (or a new jsonb column; staging
   matches `add_photo`).
2. **RLS on `scene_places` INSERT** — staff **or** scene `created_by` only
   (`063`, policy `scene_places: insert own scene or staff`). A random contributor cannot
   insert a link on someone else’s approved scene at submit time.
3. **Fiction match** — DB trigger `scene_places_place_matches_scene_fiction` rejects places
   from another fiction.
4. **Unique `(scene_id, place_id)`** — duplicate links must fail with a clear UI error.
5. **Architecture** — action → use case → port; no `supabase.from(...)` for business tables
   in `infrastructure/next` (see `.cursor/rules/fiktionmaps-architecture.mdc`).

### 1.3 Why not link-on-submit

Linking immediately would require either widening RLS (any authenticated user can mutate
public scenes) or a service-role path in the contribute action. Both fight the moderation
model. Staging + staff approve reuses the moderator session (staff passes RLS) and mirrors
`add_photo`.

---

## 2. Product shape

### 2.1 Contribution contract

| Field | Value |
|---|---|
| `type` | `add_place_to_scene` |
| `entity_type` | `scene` |
| `entity_id` | target scene id |
| Create-type? | **No** — must **not** join `isCreateContributionType` |
| On approve | Insert `scene_places` via `linkPlace` + award FPP + clear staging |
| On reject | Delete staging only; scene unchanged |

### 2.2 Wizard steps (v1)

Route: `/contribute/scene-place`.

| Step | Content |
|---|---|
| 1 | Fiction (movie / tv-series, same filter as scene contribute) |
| 2 | Scene picker (approved + active scenes for that fiction) |
| 3 | Place picker (approved + active places for that fiction, **excluding** places already linked to the scene) |
| 4 | Preview → submit |

Optional later: step for `startSecond` / `endSecond` (D3).

### 2.3 Done states

Same as other wizards: `pending` vs `approved` from `contributionAutoApproved` (staff
auto-approve path).

---

## 3. Data model

### 3.1 Enum migration

```sql
-- NNN_add_place_to_scene_contribution_type.sql
ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'add_place_to_scene';
```

Hand-update `supabase/database.types.ts` (`contribution_type` union) — `npm run gen:types`
needs local Supabase.

### 3.2 Staging table

```sql
CREATE TABLE public.contribution_pending_scene_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  start_second double precision NULL,
  end_second double precision NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_pending_scene_places_contribution_unique UNIQUE (contribution_id),
  CONSTRAINT contribution_pending_scene_places_start_non_negative
    CHECK (start_second IS NULL OR start_second >= 0),
  CONSTRAINT contribution_pending_scene_places_end_after_start
    CHECK (
      start_second IS NULL
      OR end_second IS NULL
      OR end_second > start_second
    )
);

CREATE INDEX contribution_pending_scene_places_place_id_idx
  ON public.contribution_pending_scene_places (place_id);
```

RLS (mirror `contribution_pending_images` in `047`):

- SELECT: own contribution or staff
- INSERT: own contribution with `status = pending`
- DELETE: staff

v1: one proposed place per contribution (`UNIQUE (contribution_id)`).

### 3.3 Config / docs

- `CONTRIBUTION_FPP.add_place_to_scene = 1` in `contribution.config.ts` (one contribution per place)
- Zod `contributionTypeSchema` + entity types
- `docs/reference/contributions.md` — add row to the types table; note approve applies
  `linkPlace`, not `ENTITY_PATCH_ON_CONTRIBUTION_APPROVE`

---

## 4. Application layer

### 4.1 Submit use case

`src/contributions/application/submit-add-place-to-scene-contribution.usecase.ts`

Deps (ports only):

- `contributionsRepo`: create, insert pending scene-place, count pending duplicates, approve
- `scenesRepo`: `getById` (must be approved + active; expose places or a `hasPlaceLink` helper)
- `placesRepo`: place exists, approved + active, `fictionId` matches scene

Flow:

1. Validate scene + place eligibility and same fiction.
2. Reject if `(scene_id, place_id)` already in `scene_places`.
3. Reject if a **pending** `add_place_to_scene` already targets the same scene+place
   (query via staging join).
4. `contributionsRepo.create({ type: add_place_to_scene, entityType: scene, entityId: sceneId })`.
5. Insert staging row (`place_id`, optional seconds).
6. If `autoApprove` → `approveContributionUseCase`.
7. Return `{ contributionId, autoApproved }`.

### 4.2 Approve / reject branches

In `contribution.repository.impl.ts` `approve` / `reject` (same place as `add_photo`):

**Approve `add_place_to_scene`:**

1. Load staging by `contribution_id`; fail if missing.
2. Call scenes adapter `linkPlace({ sceneId: entityId, placeId, startSecond, endSecond, createdBy: authorId })`.
   Moderator session is staff → passes RLS.
3. Delete staging row(s).
4. Set contribution `approved` + `fpp_awarded`.
5. Increment `profiles.fpp_total`.
6. **Do not** patch `scenes.status` / `active`.

**Reject:**

1. Delete staging.
2. Set contribution `rejected`.
3. **Do not** touch the scene row.

Surface unique-violation / fiction-mismatch from `linkPlace` as approve failure so staff can
retry or reject.

### 4.3 Prefer composing `linkScenePlaceUseCase`

Approve orchestration in the repo today promotes photos inline. Prefer extracting a small
hook so approve can call `linkScenePlaceUseCase` (or a thin `applyPendingScenePlaceLink`
helper) without growing more business logic inside the adapter — follow whatever pattern
`add_photo` already uses in-tree; do not invent a second architecture.

---

## 5. Infrastructure / Next

### 5.1 Action

`submitAddPlaceToSceneContributionAction` in contributions (or scenes) `infrastructure/next`:

1. `auth.getUser()`
2. Parse FormData / body with Zod (`sceneId`, `placeId`, optional seconds)
3. Resolve `autoApprove` via moderator check (same as place/scene/photo actions)
4. Call submit use case
5. `revalidatePath` / `updateTag` for scenes + contributions as needed

Result type in `*.actions.types.ts` (`success` / `error` / `contributionId` /
`contributionAutoApproved`).

### 5.2 Staff read path

- Extend feed listing for kind `scene` to include `type = add_place_to_scene` **or** keep
  create-only feed and add a detail-only path from global pending — prefer including in
  scene feed with a type badge (D5).
- Detail mapper: scene title / preview URL + proposed place name/avatar + existing
  `placeNames` on the scene for context.
- Page branch in `contributions/[contributionId]/page.tsx` + new
  `staff-add-place-to-scene-contribution-detail.tsx` (+ review aside).

### 5.3 Queries for wizard pickers

Reuse cached fiction/place lists where possible. Add a small query/use case if needed:

- `listApprovedScenesForFiction(fictionId)` for step 2
- Places for fiction minus `scene.places` for step 3 (client filter is fine if place lists
  are already loaded; server filter if lists are large)

---

## 6. UI

### 6.1 Contribute

| File | Role |
|---|---|
| `app/[locale]/(app)/contribute/scene-place/page.tsx` | Route + initial data |
| `components/contribute/scene-place/scene-place-contribute-wizard.tsx` | Wizard |
| `…-steps-aside.tsx` | Step nav |
| `…-criteria-aside.tsx` | Review criteria |
| `…-fpp-reward-card.tsx` | FPP strip |
| `…-public-preview.tsx` | Preview of scene + place chip |
| `…-done-view.tsx` | Pending / approved |

Catalog: `lib/contribute/contribution-types-catalog.ts` — new entry,
`hasWizard: true`, `href: "/contribute/scene-place"`, icon `MapPin` or `Layers`.

i18n: `Contribute.scenePlace` (and hub card copy) in `messages/en.json` + `es.json`.
Also `contribution-type-label` if staff/contributor modals list the type.

### 6.2 Staff review

- Detail: scene preview + proposed place + fiction context
- Right aside: approve / reject (`ContributionReviewActions`)
- Feed row: type label distinct from `add_scene` (“Add place to scene”)

---

## 7. Pattern checklist (parity with other flows)

### Domain / config

- [ ] Migration: enum + staging + RLS
- [ ] `database.types.ts`
- [ ] Zod / entity types
- [ ] `CONTRIBUTION_FPP`
- [ ] **Not** in `isCreateContributionType`
- [ ] `docs/reference/contributions.md`

### Application

- [ ] `submit-add-place-to-scene-contribution.usecase.ts`
- [ ] Approve / reject staging → `linkPlace`
- [ ] Staff detail / feed enrichment if needed

### Infrastructure / Next

- [ ] Parser + action + result type
- [ ] Composition root only injects repos into use cases
- [ ] Revalidate / tags

### UI

- [ ] Contribute page + wizard shell pieces
- [ ] Catalog + i18n
- [ ] Staff detail + aside + feed discrimination

---

## 8. Execution order

1. Migration (enum + staging) + types + config + reference doc row
2. Repo port methods for pending scene-place + approve/reject branches
3. Submit use case + action
4. Wizard UI + catalog + i18n
5. Staff feed/detail/review
6. Manual QA matrix (§9)

---

## 9. Test plan

- [ ] Non-staff: submit valid scene+place → contribution `pending`, no `scene_places` row yet
- [ ] Staff approve → link appears, FPP awarded, staging cleared, scene `status` unchanged
- [ ] Staff reject → staging cleared, no link, no FPP
- [ ] Staff submit → auto-approve path creates link immediately
- [ ] Place from another fiction → rejected at submit (and DB trigger as backstop)
- [ ] Duplicate existing link → clear error at submit
- [ ] Second pending for same scene+place → blocked
- [ ] Place picker excludes already-linked places after fiction+scene chosen
- [ ] Hub card navigates to wizard; done view pending vs approved copy correct
- [ ] Staff feed/detail shows proposed place and review actions

---

## 10. Relation to other plans

| Plan | Relation |
|---|---|
| `scene-places-many-to-many.md` | Prerequisite M2M + `linkPlace`; this plan is the contributor UX for “link another place” |
| `orphan-video-cleanup.md` | Unrelated (no video assets here) |
| `client-side-video-compression.md` | Unrelated |

When this ships, fold the durable contract into `docs/reference/contributions.md` and delete
or shrink this plan if it no longer adds value.
