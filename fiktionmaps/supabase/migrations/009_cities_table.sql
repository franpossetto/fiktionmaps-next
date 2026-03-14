CREATE TABLE IF NOT EXISTS public.cities (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  country    TEXT        NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  zoom       INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cities_pkey PRIMARY KEY (id)
);

DROP TRIGGER IF EXISTS set_cities_updated_at ON public.cities;

CREATE TRIGGER set_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.cities TO anon, authenticated;
