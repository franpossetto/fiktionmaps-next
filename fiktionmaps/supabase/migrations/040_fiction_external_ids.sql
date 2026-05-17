-- Provider-specific external identifiers (IMDb, Spotify, etc.) linked to fictions.
CREATE TABLE IF NOT EXISTS public.fiction_external_ids (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  fiction_id  UUID        NOT NULL,
  provider    TEXT        NOT NULL,
  external_id TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fiction_external_ids_pkey PRIMARY KEY (id),
  CONSTRAINT fiction_external_ids_fiction_id_fkey
    FOREIGN KEY (fiction_id) REFERENCES public.fictions (id)
    ON DELETE CASCADE,
  CONSTRAINT fiction_external_ids_provider_external_id_key
    UNIQUE (provider, external_id),
  CONSTRAINT fiction_external_ids_fiction_id_provider_key
    UNIQUE (fiction_id, provider)
);

COMMENT ON TABLE public.fiction_external_ids IS 'External catalog ids per fiction (imdb, spotify, …).';
COMMENT ON COLUMN public.fiction_external_ids.provider IS 'Provider slug, e.g. imdb.';
COMMENT ON COLUMN public.fiction_external_ids.external_id IS 'Provider-native id, e.g. tt0133093 for IMDb.';

CREATE INDEX IF NOT EXISTS idx_fiction_external_ids_fiction_id
  ON public.fiction_external_ids (fiction_id);

DROP TRIGGER IF EXISTS set_fiction_external_ids_updated_at ON public.fiction_external_ids;

CREATE TRIGGER set_fiction_external_ids_updated_at
  BEFORE UPDATE ON public.fiction_external_ids
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT ON public.fiction_external_ids TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiction_external_ids TO authenticated;

ALTER TABLE public.fiction_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiction_external_ids FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fiction_external_ids: anyone can read" ON public.fiction_external_ids;
CREATE POLICY "fiction_external_ids: anyone can read"
  ON public.fiction_external_ids
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "fiction_external_ids: authenticated can write" ON public.fiction_external_ids;
CREATE POLICY "fiction_external_ids: authenticated can write"
  ON public.fiction_external_ids
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
