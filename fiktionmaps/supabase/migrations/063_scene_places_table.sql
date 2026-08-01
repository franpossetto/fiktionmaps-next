-- scene_places: a scene may span several places (N:M) — e.g. a driving scene crossing a city —
-- ordered, each with an optional playback window inside the scene's video.
-- Supersedes scenes.place_id, which becomes nullable here and is dropped in 064.
--
-- Expand step of an expand/contract migration:
--   063 (this file)  create + backfill + relax scenes.place_id  → old and new code both work
--   deploy           code reads/writes scene_places only
--   064              ALTER TABLE scenes DROP COLUMN place_id
--
-- Rollback before 064: revert the code deploy. The column is still present and populated for
-- every pre-existing scene, but scenes created by the new code have place_id = NULL and would
-- not be visible to the reverted code.

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

COMMENT ON COLUMN public.scene_places.sort_order IS
  'Order of the place within the scene. Not unique per scene: always order by (sort_order, created_at).';
COMMENT ON COLUMN public.scene_places.start_second IS
  'Playback position (seconds) where this place first appears in the scene video. NULL = unknown.';
COMMENT ON COLUMN public.scene_places.end_second IS
  'Playback position (seconds) where this place stops appearing. NULL = unknown / until the end.';

CREATE INDEX IF NOT EXISTS idx_scene_places_scene_sort
  ON public.scene_places (scene_id, sort_order, created_at);

-- "Scenes at this place" is the hottest lookup (map sidebar panel, place detail page,
-- place-scoped nav search). Neither the PK nor scene_places_scene_place_unique can serve it.
CREATE INDEX IF NOT EXISTS idx_scene_places_place
  ON public.scene_places (place_id, scene_id);

DROP TRIGGER IF EXISTS set_scene_places_updated_at ON public.scene_places;
CREATE TRIGGER set_scene_places_updated_at
  BEFORE UPDATE ON public.scene_places
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Fiction consistency (replaces scenes_place_matches_fiction from 021)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RLS (mirrors scenes: 022 / 034 / 041 / 057)
-- ---------------------------------------------------------------------------

ALTER TABLE public.scene_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_places FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_places TO anon, authenticated;

-- Visibility is delegated to the scenes SELECT policy (approved / creator / staff, 034):
-- RLS applies inside this subquery, so status visibility has a single source of truth.
DROP POLICY IF EXISTS "scene_places: select when scene visible" ON public.scene_places;
CREATE POLICY "scene_places: select when scene visible"
  ON public.scene_places
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.scenes s WHERE s.id = scene_id));

-- A contributor must be able to link a place to the scene they just created (still pending),
-- because scenes UPDATE/DELETE is staff-only (057) and nothing could be fixed afterwards.
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

-- ---------------------------------------------------------------------------
-- Backfill + relax scenes.place_id + retire the old trigger
-- ---------------------------------------------------------------------------

-- One link per existing scene, sort_order 0, no playback window. Idempotent: migrations are
-- applied manually and this file may be re-run.
INSERT INTO public.scene_places (scene_id, place_id, sort_order, start_second, end_second, created_by)
SELECT s.id, s.place_id, 0, NULL, NULL, s.created_by
FROM public.scenes s
WHERE s.place_id IS NOT NULL
ON CONFLICT (scene_id, place_id) DO NOTHING;

-- Lets the new code insert a scene with no place yet (creating a scene and linking a place are
-- separate operations) before 064 drops the column.
ALTER TABLE public.scenes ALTER COLUMN place_id DROP NOT NULL;

-- Superseded by trg_scene_places_place_matches_fiction. This must go NOW rather than in 064:
-- scenes_place_matches_fiction() raises on any INSERT whose place_id is NULL, which is exactly
-- what the new create-scene path does. Its trigger also fires on UPDATE OF fiction_id, so it
-- would keep breaking scene writes even after the column is dropped.
DROP TRIGGER IF EXISTS trg_scenes_place_matches_fiction ON public.scenes;
DROP FUNCTION IF EXISTS public.scenes_place_matches_fiction();

-- ---------------------------------------------------------------------------
-- Post-apply sanity checks (run manually)
-- ---------------------------------------------------------------------------
-- SELECT count(*) FROM public.scenes;                    -- N
-- SELECT count(*) FROM public.scene_places;              -- N
-- SELECT count(*) FROM public.scenes s
--   LEFT JOIN public.scene_places sp ON sp.scene_id = s.id
--   WHERE sp.id IS NULL;                                 -- 0
