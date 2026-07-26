# Hunt — Sources, candidate places, and persistence

Simple plan for implementation.  
Architecture: `domain → application → infrastructure/supabase → infrastructure/next`.

---

## Current state (POC)

- `/contribute/hunt` — paste URL, run pipeline, no DB write
- `/contribute/hunt/confirm` — review in browser (`sessionStorage` only)
- Finish review does not persist

---

## Goal

Hunt is for **discovering and reviewing candidate places** from web sources. It may optionally link to an existing fiction.

1. **Research** — register source URLs (`fiction_id` or `context_label`)
2. **Scrape** — fetch page once per source; markdown saved on `hunt_sources`
3. **Hunt** — 1 hunt = 1 source: extract places from cached scrape → review → save payload on `hunts`
4. **Moderation** — approver creates real `place` entities (fiction linked when known)

---

## Existing entities (unchanged)

| Entity | Role |
|--------|------|
| `fictions` | Movie / series / book |
| `places` | Published filming location |
| `locations` | Address + coordinates |
| `cities` | City linked to location |
| `contributions` | Moderation record (`create_place`, etc.) |

Places are **only** created after moderation approval.

---

## New entities (2 tables)

### `hunt_sources` — research + scrape cache

URL registry under a known fiction **or** a provisional label. **Scrape lives here** so Jina is not repeated across hunt runs.

| Column | Notes |
|--------|-------|
| `id` | PK |
| `fiction_id` | → `fictions`, **nullable** |
| `context_label` | e.g. `"Titanic"` when fiction not in DB yet |
| `context_label_normalized` | Dedup when `fiction_id` is null |
| `source_url` | Full URL |
| `source_url_normalized` | Dedup key |
| `scraped_markdown` | Scrape output (null until scraped) |
| `scrape_provider` | `jina` \| `direct` |
| `scrape_status` | `pending` \| `ok` \| `failed` |
| `research_note` | Optional |
| `created_by` | → `profiles` |
| `created_at`, `updated_at` | |

**Rules:**

- At least one of `fiction_id` or `context_label` must be set.
- If fiction **exists** → use `fiction_id` (do not create a parallel `context_label`).
- If fiction **does not exist** → use `context_label`.
- Before adding a source, **search for an existing fiction**. If found, use `fiction_id`.

**Re-scrape:**

| Case | Action |
|------|--------|
| Scrape failed (451, timeout) | **Re-scrape** button on source row |
| Page changed or different fetch lib | **Re-scrape** (overwrites `scraped_markdown`) |
| Scrape OK, want new extraction only | **New hunt** — reads cached markdown, no Jina call |

### `hunts` — extraction + review (one run per source)

| Column | Notes |
|--------|-------|
| `id` | PK |
| `hunt_source_id` | → `hunt_sources` (required) |
| `payload` | JSONB `{ places: HuntPlaceReviewed[] }` |
| `status` | `draft` \| `in_review` \| `submitted` \| `approved` \| `rejected` |
| `outcome` | `places_created` \| `partial` \| `no_value` \| `failed_pipeline` |
| `hunter_note` | Required if 0 approved on finish |
| `stats` | JSONB `{ extracted, approved, skipped, … }` |
| `created_by`, `reviewed_by`, `reviewed_at` | |
| `created_at`, `updated_at` | |

No scrape columns on `hunts` — it always reads from `hunt_sources.scraped_markdown`.

---

## Examples

### 1. Titanic does not exist yet

**hunt_sources**

| id | fiction_id | context_label | source_url | scrape_status |
|----|------------|---------------|------------|---------------|
| hs1 | null | Titanic | movie-locations.com/.../Titanic.php | ok |
| hs2 | null | Titanic | atlasofwonders.com/.../titanic | pending |

**hunts**

| id | hunt_source_id | payload | status |
|----|----------------|---------|--------|
| h1 | hs1 | 18 candidate places | submitted |

Moderator approves → creates **fiction Titanic**, links sources (`fiction_id`), materializes approved places.

### 2. Scrape failed, then retried

**hunt_sources** (hs2 after retry)

| id | scrape_status | scraped_markdown |
|----|---------------|------------------|
| hs2 | ok | *(text saved on 2nd attempt)* |

First attempt: `scrape_status = failed`. User clicks Re-scrape → overwrites on success.

### 3. Titanic already exists

**hunt_sources**

| id | fiction_id | context_label | source_url | scrape_status |
|----|------------|---------------|------------|---------------|
| hs3 | `titanic-uuid` | null | new-blog.com/titanic-locations | ok |

Do **not** use `context_label = "Titanic"` when the fiction row exists.

---

## User flow

```
1. Search fiction
   → found: use fiction_id
   → not found: enter context_label (e.g. "Titanic")

2. Add source URLs           → hunt_sources (scrape_status = pending)

3. Scrape source (optional)  → scraped_markdown on hunt_sources
   or auto-scrape on first Hunt

4. Hunt a source             → hunts row → extract from cached markdown → review UI

5. Finish review             → payload + stats + note → status submitted

6. Moderator approves        → link fiction if needed → INSERT places
```

Duplicate candidates across sources = separate hunt payloads; dedup at **review/approve**.

---

## Payload shape

```ts
interface HuntPlaceReviewed extends HuntPlace {
  review_decision?: "approved" | "skipped_duplicate" | "skipped_low_quality" | "skipped_other"
  review_note?: string
  coords_adjusted?: { lat: number; lng: number } | null
}
```

(`HuntPlace` in `src/hunts/domain/hunt.types.ts`)

---

## UI impact

| Today | After |
|-------|-------|
| Fiction + paste URL | Search fiction **or** context label → **source list** |
| Instant scrape + IA | **Scrape** per source, then **Hunt** (or combined on first hunt) |
| `/confirm` + sessionStorage | `/contribute/hunt/[huntId]/review` |
| Finish → nothing saved | Finish → `submitted`; places only after moderation |

Source list shows scrape status (pending / ok / failed) + Re-scrape button. Review screen stays the same.

---

## SQL (draft)

```sql
CREATE TABLE public.hunt_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  fiction_id UUID REFERENCES public.fictions(id) ON DELETE SET NULL,
  context_label TEXT,
  context_label_normalized TEXT,

  source_url TEXT NOT NULL,
  source_url_normalized TEXT NOT NULL,

  scraped_markdown TEXT,
  scrape_provider TEXT,
  scrape_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (scrape_status IN ('pending', 'ok', 'failed')),

  research_note TEXT,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    fiction_id IS NOT NULL OR context_label IS NOT NULL
  )
);

CREATE UNIQUE INDEX unique_hunt_source_by_fiction
ON public.hunt_sources(fiction_id, source_url_normalized)
WHERE fiction_id IS NOT NULL;

CREATE UNIQUE INDEX unique_hunt_source_by_context
ON public.hunt_sources(context_label_normalized, source_url_normalized)
WHERE fiction_id IS NULL;

CREATE INDEX idx_hunt_sources_fiction_id ON public.hunt_sources(fiction_id)
WHERE fiction_id IS NOT NULL;

CREATE TABLE public.hunts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_source_id UUID NOT NULL REFERENCES public.hunt_sources(id) ON DELETE CASCADE,

  payload JSONB NOT NULL DEFAULT '{"places":[]}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'submitted', 'approved', 'rejected')),
  outcome TEXT
    CHECK (outcome IN ('places_created', 'partial', 'no_value', 'failed_pipeline')),
  hunter_note TEXT,
  stats JSONB NOT NULL DEFAULT '{}',

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hunts_hunt_source_id ON public.hunts(hunt_source_id);
CREATE INDEX idx_hunts_status ON public.hunts(status);
CREATE INDEX idx_hunts_created_by ON public.hunts(created_by);
```

---

## Implementation phases

### Phase 1 — Sources + schema

- [ ] Migrations above
- [ ] CRUD `hunt_sources` (fiction search + context_label path)
- [ ] `scrapeHuntSourceUseCase` (Jina/direct → save on source)
- [ ] UI: source list + scrape status + Re-scrape

### Phase 2 — Hunt pipeline

- [ ] `createHuntUseCase` (read cached markdown → extract → save payload)
- [ ] Review at `/contribute/hunt/[id]/review`
- [ ] `finishHuntReviewUseCase`
- [ ] Drop `sessionStorage`

### Phase 3 — Moderation

- [ ] Approve → link `fiction_id` on sources if still null → create places
- [ ] Staff queue
- [ ] Contributions on materialized places

### Backlog

- [ ] `JINA_API_KEY`, direct fetch fallback on 451
- [ ] Scrape history table (v2) if audit trail needed

---

## Key files today

```
src/hunts/application/preview-hunt.usecase.ts
src/hunts/domain/hunt.types.ts
components/contribute/hunt/
docs/plans/hunt-wizard-ia.md
```

---

## Rules

1. Hunt = candidate places from sources; fiction link is optional.
2. `hunt_sources`: `fiction_id` **or** `context_label` (at least one).
3. Search existing fiction before adding sources; prefer `fiction_id`.
4. **Scrape on `hunt_sources`**; payload + review on `hunts`.
5. 1 hunt = 1 source; re-extract = new hunt, re-scrape = update source.
6. Finish always saves (note required if 0 approved).
7. **Places only after moderator approval.**
