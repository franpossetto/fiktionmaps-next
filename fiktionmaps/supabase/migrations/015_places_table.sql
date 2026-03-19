CREATE TABLE IF NOT EXISTS public.places (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  fiction_id  UUID        NOT NULL REFERENCES public.fictions (id) ON DELETE CASCADE,
  location_id UUID        REFERENCES public.locations (id),
  description TEXT,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT places_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_places_fiction_id ON public.places (fiction_id);
CREATE INDEX idx_places_location_id ON public.places (location_id);

DROP TRIGGER IF EXISTS set_places_updated_at ON public.places;

CREATE TRIGGER set_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.places TO anon, authenticated;
