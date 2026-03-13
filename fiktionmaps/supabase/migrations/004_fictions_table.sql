CREATE TABLE IF NOT EXISTS public.fictions (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('movie', 'book', 'tv-series')),
  year         INTEGER     NOT NULL,
  author       TEXT,
  poster_color TEXT        NOT NULL,
  genre        TEXT        NOT NULL,
  cover_image  TEXT,
  banner_image TEXT,
  description  TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fictions_pkey PRIMARY KEY (id)
);

DROP TRIGGER IF EXISTS set_fictions_updated_at ON public.fictions;

CREATE TRIGGER set_fictions_updated_at
  BEFORE UPDATE ON public.fictions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.fictions TO anon, authenticated;
