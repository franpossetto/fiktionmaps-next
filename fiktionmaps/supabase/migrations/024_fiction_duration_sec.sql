-- Total runtime in seconds for audiovisual fictions (movie / tv-series). Used for scene timeline UI.
-- NULL = unknown (UI may use a fallback).

ALTER TABLE public.fictions
  ADD COLUMN IF NOT EXISTS duration_sec INTEGER;

COMMENT ON COLUMN public.fictions.duration_sec IS 'Full work runtime in seconds (movies / series). NULL if not set.';

ALTER TABLE public.fictions
  DROP CONSTRAINT IF EXISTS fictions_duration_sec_check;

ALTER TABLE public.fictions
  ADD CONSTRAINT fictions_duration_sec_check
  CHECK (duration_sec IS NULL OR duration_sec > 0);
