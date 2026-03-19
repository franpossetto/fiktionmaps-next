CREATE TABLE IF NOT EXISTS public.locations (
  id                UUID             NOT NULL DEFAULT gen_random_uuid(),
  formatted_address TEXT             NOT NULL,
  post_code         TEXT,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  name              TEXT             NOT NULL,
  type              TEXT,
  external_id       TEXT,
  provider          TEXT,
  city_id           UUID             NOT NULL REFERENCES public.cities (id),
  is_landmark       BOOLEAN          NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT locations_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_locations_city_id ON public.locations (city_id);
CREATE INDEX idx_locations_lat_lng ON public.locations (latitude, longitude);

DROP TRIGGER IF EXISTS set_locations_updated_at ON public.locations;

CREATE TRIGGER set_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.locations TO anon, authenticated;
