-- Phase 1: Hunt sources (URL registry + scrape cache) and Hunts (extraction runs).
-- Replaces the old single-table design from wizard-ia.md.
--
-- hunt_sources: one row per URL, caches the scraped markdown so Jina is called only once.
-- hunts:        one row per extraction run against a source; payload is reviewed here.

-- ── hunt_sources ─────────────────────────────────────────────────────────────

CREATE TABLE public.hunt_sources (
  id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
  fiction_id              UUID        REFERENCES public.fictions(id) ON DELETE SET NULL,
  context_label           TEXT,
  context_label_normalized TEXT,
  source_url              TEXT        NOT NULL,
  source_url_normalized   TEXT        NOT NULL,
  scraped_markdown        TEXT,
  scrape_provider         TEXT,
  scrape_status           TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (scrape_status IN ('pending', 'ok', 'failed')),
  research_note           TEXT,
  created_by              UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hunt_sources_pkey PRIMARY KEY (id),
  CONSTRAINT hunt_sources_fiction_or_label
    CHECK (fiction_id IS NOT NULL OR context_label IS NOT NULL)
);

-- Dedup: (fiction_id, url) when fiction is known
CREATE UNIQUE INDEX unique_hunt_source_by_fiction
  ON public.hunt_sources(fiction_id, source_url_normalized)
  WHERE fiction_id IS NOT NULL;

-- Dedup: (context_label_normalized, url) when fiction is unknown
CREATE UNIQUE INDEX unique_hunt_source_by_context
  ON public.hunt_sources(context_label_normalized, source_url_normalized)
  WHERE fiction_id IS NULL;

CREATE INDEX idx_hunt_sources_fiction_id ON public.hunt_sources(fiction_id)
  WHERE fiction_id IS NOT NULL;

CREATE INDEX idx_hunt_sources_created_by ON public.hunt_sources(created_by);

-- ── hunts ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.hunts (
  id              UUID        NOT NULL DEFAULT gen_random_uuid(),
  hunt_source_id  UUID        NOT NULL REFERENCES public.hunt_sources(id) ON DELETE CASCADE,
  payload         JSONB       NOT NULL DEFAULT '{"places":[]}',
  status          TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'in_review', 'submitted', 'approved', 'rejected')),
  outcome         TEXT
                    CHECK (outcome IN ('places_created', 'partial', 'no_value', 'failed_pipeline')),
  hunter_note     TEXT,
  stats           JSONB       NOT NULL DEFAULT '{}',
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hunts_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_hunts_hunt_source_id ON public.hunts(hunt_source_id);
CREATE INDEX idx_hunts_status          ON public.hunts(status);
CREATE INDEX idx_hunts_created_by      ON public.hunts(created_by);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.hunt_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunts        ENABLE ROW LEVEL SECURITY;

-- Contributors see their own sources; staff (moderator+) sees all.
CREATE POLICY "hunt_sources_select"
  ON public.hunt_sources FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_staff_profile()
  );

CREATE POLICY "hunt_sources_insert"
  ON public.hunt_sources FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "hunt_sources_update"
  ON public.hunt_sources FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_staff_profile()
  );

CREATE POLICY "hunt_sources_delete"
  ON public.hunt_sources FOR DELETE
  USING (
    created_by = auth.uid()
    OR is_staff_profile()
  );

-- Same rules for hunts.
CREATE POLICY "hunts_select"
  ON public.hunts FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_staff_profile()
  );

CREATE POLICY "hunts_insert"
  ON public.hunts FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "hunts_update"
  ON public.hunts FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_staff_profile()
  );

CREATE POLICY "hunts_delete"
  ON public.hunts FOR DELETE
  USING (
    created_by = auth.uid()
    OR is_staff_profile()
  );

-- ── Contributions: origin tracking ───────────────────────────────────────────
-- origin:      who/what created this contribution ('manual' = human, 'hunt' = AI pipeline)
-- external_id: polymorphic reference to the originating process (e.g. hunts.id when origin = 'hunt')

ALTER TABLE public.contributions
  ADD COLUMN origin      TEXT NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual', 'hunt')),
  ADD COLUMN external_id UUID NULL;

CREATE INDEX idx_contributions_origin      ON public.contributions(origin) WHERE origin <> 'manual';
CREATE INDEX idx_contributions_external_id ON public.contributions(external_id) WHERE external_id IS NOT NULL;
