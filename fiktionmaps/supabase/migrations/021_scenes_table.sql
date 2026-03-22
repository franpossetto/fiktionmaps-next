-- Scenes: video clips tied to a fiction + place (narrative location).
-- Books do not use scenes; only audiovisual fictions (movie / tv-series).

CREATE TABLE IF NOT EXISTS public.scenes (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  fiction_id       UUID        NOT NULL REFERENCES public.fictions (id) ON DELETE CASCADE,
  place_id         UUID        NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  quote            TEXT,
  timestamp_label  TEXT,
  season             SMALLINT,
  episode            SMALLINT,
  episode_title      TEXT,
  video_url          TEXT,
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by         UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT scenes_pkey PRIMARY KEY (id),
  CONSTRAINT scenes_season_positive CHECK (season IS NULL OR season > 0),
  CONSTRAINT scenes_episode_positive CHECK (episode IS NULL OR episode > 0),
  CONSTRAINT scenes_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_scenes_fiction_id ON public.scenes (fiction_id);
CREATE INDEX IF NOT EXISTS idx_scenes_place_id ON public.scenes (place_id);
CREATE INDEX IF NOT EXISTS idx_scenes_active ON public.scenes (active);
CREATE INDEX IF NOT EXISTS idx_scenes_fiction_sort ON public.scenes (fiction_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_scenes_place_sort ON public.scenes (place_id, sort_order, created_at);

DROP TRIGGER IF EXISTS set_scenes_updated_at ON public.scenes;
CREATE TRIGGER set_scenes_updated_at
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Ensure place belongs to the same fiction as the scene row.
CREATE OR REPLACE FUNCTION public.scenes_place_matches_fiction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.places p
    WHERE p.id = NEW.place_id
      AND p.fiction_id = NEW.fiction_id
  ) THEN
    RAISE EXCEPTION 'scenes: place_id must reference a place for the same fiction_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scenes_place_matches_fiction ON public.scenes;
CREATE TRIGGER trg_scenes_place_matches_fiction
  BEFORE INSERT OR UPDATE OF place_id, fiction_id ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.scenes_place_matches_fiction();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO anon, authenticated;
