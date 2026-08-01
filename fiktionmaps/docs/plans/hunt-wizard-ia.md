# Hunt — Planning prompt for Claude Code

## Project context

Stack: Next.js + Supabase + TypeScript  
Architecture: Clean Architecture with `action → useCase → repo` layers  
App: FiktionMaps — mapping real-world filming locations from fictions (films, series)

Existing roles: `user`, `contributor`, `moderator`, `admin`  
Existing RLS helper: `is_staff_profile()` (covers moderator+)  
Role convention: TEXT with CHECK constraint, no Postgres enum

---

## What is Hunt

A feature for contributors that uses AI to assist with filming location ingestion from any web page. The contributor pastes a URL, the system scrapes the HTML, an LLM agent extracts the places, checks for duplicates against the selected fiction, and returns the result for review before any data is persisted.

---

## Design decisions

- One URL at a time (no source cascade)
- Contributor selects a pre-existing fiction (always `places_only` mode)
- Any page is valid — no per-source parsers
- **Do not invent data.** The agent must only output what is explicitly present in the source (page content) or, in the enrichment step, what it knows with high confidence from training data. If a field is missing or uncertain, leave it empty — never guess or fill gaps.
- Empty-field convention: use `""` for missing strings, `null` for missing numbers (`lat`, `lng`), `false` for `is_landmark` when unknown
- If the page has no filming locations, return an empty `places` array
- Duplicate detection: semantic (agent compares name + city against all existing places for that fiction)
- POC is synchronous: no Edge Functions, everything runs in the useCase
- POC does not persist data: the pipeline runs and returns the result to the client for review and refinement
- LLM: OpenAI GPT-4o-mini via `OPENAI_API_KEY`

---

## Domain data types

Hunt eventually maps extracted data into the existing FiktionMaps model. Reference types below — do not invent fields outside these shapes.

### `Fiction` (`public.fictions`)

Pre-selected by the contributor; Hunt does not create fictions.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | PK |
| `title` | `TEXT` | NOT NULL |
| `type` | `TEXT` | `'movie' \| 'book' \| 'tv-series'` |
| `year` | `INTEGER` | NOT NULL |
| `author` | `TEXT` | nullable |
| `genre` | `TEXT` | NOT NULL |
| `description` | `TEXT` | NOT NULL |
| `active` | `BOOLEAN` | |
| `slug` | `TEXT` | NOT NULL, unique |
| `duration_sec` | `INTEGER` | nullable |
| `status` | `TEXT` | `'pending' \| 'approved' \| 'rejected'` |
| `original_language` | `TEXT` | nullable |
| `content_language` | `TEXT` | nullable |

### `City` (`public.cities`)

Created or matched at approval time (Phase 3). Hunt extracts `city` + `country` as plain text.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | PK |
| `name` | `TEXT` | NOT NULL |
| `country` | `TEXT` | NOT NULL |
| `lat` | `DOUBLE PRECISION` | NOT NULL — map center |
| `lng` | `DOUBLE PRECISION` | NOT NULL — map center |
| `zoom` | `INTEGER` | NOT NULL |

### `Location` (`public.locations`)

One row per physical address/coordinates. Linked to a `city_id`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | PK |
| `name` | `TEXT` | NOT NULL — recognizable place name (e.g. "Brooklyn Bridge") |
| `formatted_address` | `TEXT` | NOT NULL — street address or best-known address |
| `post_code` | `TEXT` | nullable |
| `latitude` | `DOUBLE PRECISION` | NOT NULL |
| `longitude` | `DOUBLE PRECISION` | NOT NULL |
| `type` | `TEXT` | nullable — venue type |
| `city_id` | `UUID` | NOT NULL → `cities.id` |
| `is_landmark` | `BOOLEAN` | NOT NULL, default `false` |
| `external_id` | `TEXT` | nullable |
| `provider` | `TEXT` | nullable |

Domain entity (`Location`): `name`, `address`, `lat`, `lng`, `cityId`, `locationType?`, `isLandmark?`.

### `Place` (`public.places`)

Filming location within a fiction. Joins `fiction_id` + `location_id`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUID` | PK |
| `fiction_id` | `UUID` | NOT NULL → `fictions.id` |
| `location_id` | `UUID` | nullable → `locations.id` |
| `name` | `TEXT` | NOT NULL, max 80 chars — display name for this fiction |
| `slug` | `TEXT` | NOT NULL — unique per `(fiction_id, slug)` |
| `description` | `TEXT` | nullable — scene context |
| `active` | `BOOLEAN` | NOT NULL, default `true` |
| `status` | `TEXT` | `'pending' \| 'approved' \| 'rejected'` |
| `created_by` | `UUID` | nullable → `profiles.id` |

Domain entity (`Place`): `id`, `name`, `slug`, `fictionId`, `location` (nested `Location`), `description`, plus media/scene fields not relevant to Hunt.

### `HuntPlace` (pipeline output — `src/hunts/domain/hunt.types.ts`)

What the POC returns. Maps loosely to `Place` + `Location` + `City` text fields.

```ts
interface HuntPlace {
  name: string           // → places.name + locations.name
  address: string        // → locations.formatted_address ("" if unknown)
  city: string           // → used to match/create cities.name
  country: string        // → used to match/create cities.country
  description: string    // → places.description ("" if not on page)
  confidence: "high" | "medium" | "low"
  address_source: "page" | "geocoded" | "knowledge" | "unknown"
  is_landmark: boolean
  lat: number | null     // null until geocoded (Phase 2)
  lng: number | null
  duplicate_of: string | null  // existing places.id if duplicate
}
```

**Field sourcing rules:**

| HuntPlace field | Source | If missing |
|-----------------|--------|------------|
| `name` | Page content | Omit place (do not invent) |
| `address` | Page, then enrichment (high-confidence knowledge only) | `""` |
| `city` | Page content | `""` |
| `country` | Page content | `""` |
| `description` | Page content | `""` |
| `is_landmark` | Enrichment step only | `false` |
| `lat` / `lng` | Geocoding (Phase 2) | `null` |
| `address_source` | Set by pipeline | `"page"`, `"knowledge"`, or `"unknown"` |

---

## Layer architecture

### Repo: `placeRepo` (existing — verify this method exists)

```ts
placeRepo.findByFiction(fictionId)  // SELECT all places for a fiction with lat/lng
```

If this method does not exist, add it. It is the only DB read in the POC.

### UseCase: `previewHuntUseCase`

This useCase writes nothing to DB. It only collects and returns.

1. Validate that the user has role `contributor` or higher
2. Fetch the HTML from `source_url` with a realistic User-Agent
3. Call `extractPlacesFromHtml(html, fictionTitle)` → array of raw places
4. If the array is empty, return an empty result with a clear message
5. For each extracted place: run `findDuplicates(place, fictionId)`
6. Return the enriched places array with `duplicate_of` — without persisting anything

### Action

```ts
previewHuntAction(formData: { source_url: string, fiction_id: string })
// Returns: { places: HuntPlace[], source_url: string, fiction_id: string }
// Does not write to DB
```

---

## AI logic

### `extractPlacesFromHtml(html, fictionTitle)`

OpenAI GPT-4o-mini call. Strip the HTML to plain text before sending — raw HTML is noisy and wastes tokens.

Base prompt:
```
You are a filming location extractor. Your task is to find real-world places where "${fictionTitle}" was filmed.

Analyze the following web page content and extract ONLY the places that are explicitly mentioned as filming locations.

RULES:
- Do not invent or infer places that are not present in the text
- Do not invent or guess field values — if a field is not in the text, leave it empty
- If you find no filming locations, return an empty array
- "name": recognizable place name in Title Case (never a raw street address)
- "address": only what is explicitly written on the page; leave "" if not mentioned
- "city": Title Case, from the page; leave "" if not mentioned
- "country": Title Case, from the page; leave "" if not mentioned
- "description": 1–2 sentences from the page about the scene; leave "" if not available
- "confidence": "high" if clearly stated as a filming location, "medium" if likely, "low" if ambiguous

Reply ONLY with valid JSON, no additional text:
{ "places": [ { "name": "", "address": "", "city": "", "country": "", "description": "", "confidence": "high|medium|low" } ] }

CONTENT:
${textContent}
```

**Enrichment step** (separate call per place, after extraction):

- May fill `address` and `is_landmark` from training knowledge **only with high confidence**
- If unsure, leave `address` as `""` and set `address_source: "unknown"`
- Never invent `city`, `country`, or `description` in enrichment — those come from the page only

### `findDuplicates(place, fictionId)`

1. Fetch all existing places for that fiction via `placeRepo.findByFiction`
2. Semantic deduplication: call GPT-4o-mini with the new place + all existing places for that fiction
3. Ask: does this new place refer to a location that already exists in the list?
4. Return `duplicate_of: uuid` of the existing place if it is a duplicate, or `null`

Note: in the POC, extracted places do not have lat/lng yet (that comes with geocoding in Phase 2). Deduplication is therefore semantic only — comparing name and city against existing places using GPT-4o-mini.

---

## Routes and UI

### `/hunt` (requires role `contributor+`)

- Fiction selector (autocomplete over existing fictions)
- URL input
- "Hunt" button
- Loading state while the pipeline runs (may take 10–20s in the POC)
- Result: list of extracted places with confidence badge and duplicate flag
- Result is display-only for now — no save button in the POC

---

## Required environment variables

```
OPENAI_API_KEY=sk-...
```

---

## Implementation phases

### Phase 1 — Collection pipeline, no persistence (POC)
- Verify / add `placeRepo.findByFiction` if missing
- `extractPlacesFromHtml` with OpenAI
- `findDuplicates` with semantic matching via OpenAI
- `previewHuntUseCase` — no DB writes
- `previewHuntAction`
- `/hunt` page with form and visual result

**Goal of this phase:** validate that the pipeline extracts places correctly and detects duplicates. Refine prompts and logic before persisting anything.

### Phase 2 — DB + persistence (after validating the POC)
- SQL migration for the `hunts` table (see schema below)
- Add `contributor` role if missing
- RLS policies
- `huntRepo` with required methods
- `createHuntUseCase` — same as previewHunt but saves the result to `hunts` with `status: 'pending'`
- Mapbox geocoding to obtain lat/lng before saving

### Phase 3 — Moderation
- `approveHuntUseCase`: real INSERTs into places/locations/cities
- `rejectHuntUseCase`
- `approveHuntAction`, `rejectHuntAction`
- `/hunt/[id]` page for moderators

---

## DB schema (for Phase 2 — do not implement in the POC)

```sql
CREATE TABLE public.hunts (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
  source_url   TEXT,
  fiction_id   UUID        NOT NULL REFERENCES public.fictions(id) ON DELETE CASCADE,
  payload      JSONB,
  sources      JSONB,
  created_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hunts_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_hunts_fiction_id ON public.hunts(fiction_id);
CREATE INDEX idx_hunts_status ON public.hunts(status);
CREATE INDEX idx_hunts_created_by ON public.hunts(created_by);
```

`payload` shape (matches `HuntPlace`):
```json
{
  "places": [
    {
      "name": "string",
      "address": "string — empty if unknown",
      "city": "string — empty if unknown",
      "country": "string — empty if unknown",
      "description": "string — empty if unknown",
      "lat": null,
      "lng": null,
      "confidence": "high | medium | low",
      "address_source": "page | geocoded | knowledge | unknown",
      "is_landmark": false,
      "duplicate_of": "uuid | null"
    }
  ]
}
```

---

## Post-POC backlog

- Mapbox geocoding per place (lat/lng + formatted_address)
- Persistence to `hunts` table
- FPP to contributor on hunt approval
- Per-place editing before approval
- Street View as placeholder photo
- Edge Function for async pipeline if response time becomes an issue
- Minimum required fields per place before a hunt can be approved