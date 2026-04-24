-- persons: real-world people (authors, directors, actors, etc.)
CREATE TABLE public.persons (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  bio         TEXT,
  photo_url   TEXT,
  birth_year  INTEGER,
  nationality TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT persons_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX persons_name_idx ON public.persons (LOWER(TRIM(name)));

DROP TRIGGER IF EXISTS set_persons_updated_at ON public.persons;
CREATE TRIGGER set_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.persons TO anon, authenticated;

-- fiction_persons: junction table linking fictions to persons with a role
CREATE TABLE public.fiction_persons (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  fiction_id  UUID        NOT NULL REFERENCES public.fictions(id) ON DELETE CASCADE,
  person_id   UUID        NOT NULL REFERENCES public.persons(id)  ON DELETE CASCADE,
  role        TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fiction_persons_pkey    PRIMARY KEY (id),
  CONSTRAINT fiction_persons_unique  UNIQUE (fiction_id, person_id, role)
);

CREATE INDEX idx_fiction_persons_fiction_id ON public.fiction_persons(fiction_id);
CREATE INDEX idx_fiction_persons_person_id  ON public.fiction_persons(person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiction_persons TO anon, authenticated;

-- RLS
ALTER TABLE public.persons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fiction_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiction_persons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "persons: anyone can read" ON public.persons;
CREATE POLICY "persons: anyone can read"
  ON public.persons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "persons: authenticated can insert" ON public.persons;
CREATE POLICY "persons: authenticated can insert"
  ON public.persons FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "persons: authenticated can update" ON public.persons;
CREATE POLICY "persons: authenticated can update"
  ON public.persons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "persons: authenticated can delete" ON public.persons;
CREATE POLICY "persons: authenticated can delete"
  ON public.persons FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "fiction_persons: anyone can read" ON public.fiction_persons;
CREATE POLICY "fiction_persons: anyone can read"
  ON public.fiction_persons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "fiction_persons: authenticated can insert" ON public.fiction_persons;
CREATE POLICY "fiction_persons: authenticated can insert"
  ON public.fiction_persons FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fiction_persons: authenticated can update" ON public.fiction_persons;
CREATE POLICY "fiction_persons: authenticated can update"
  ON public.fiction_persons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fiction_persons: authenticated can delete" ON public.fiction_persons;
CREATE POLICY "fiction_persons: authenticated can delete"
  ON public.fiction_persons FOR DELETE TO authenticated USING (true);

-- Backfill: migrate existing fictions.author text into persons + fiction_persons
INSERT INTO public.persons (name)
SELECT DISTINCT TRIM(author)
FROM public.fictions
WHERE author IS NOT NULL AND TRIM(author) <> '';

INSERT INTO public.fiction_persons (fiction_id, person_id, role)
SELECT
  f.id,
  p.id,
  CASE WHEN f.type = 'movie' THEN 'director' ELSE 'author' END
FROM public.fictions f
JOIN public.persons p ON p.name = TRIM(f.author)
WHERE f.author IS NOT NULL AND TRIM(f.author) <> '';
