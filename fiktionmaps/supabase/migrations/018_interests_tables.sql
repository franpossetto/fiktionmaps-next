-- Interests / onboarding recommendations (v1)
-- Tables:
-- - public.interests
-- - public.interest_translations
-- - public.fiction_interests
-- - public.user_interests

-- 1) interests (catalog)
CREATE TABLE IF NOT EXISTS public.interests (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL UNIQUE,
  category    TEXT        NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT interests_pkey PRIMARY KEY (id)
);

DROP TRIGGER IF EXISTS set_interests_updated_at ON public.interests;
CREATE TRIGGER set_interests_updated_at
  BEFORE UPDATE ON public.interests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2) interest_translations
CREATE TABLE IF NOT EXISTS public.interest_translations (
  interest_id UUID NOT NULL,
  locale      TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT NULL,

  CONSTRAINT interest_translations_pkey PRIMARY KEY (interest_id, locale),
  CONSTRAINT interest_translations_interest_id_fkey
    FOREIGN KEY (interest_id) REFERENCES public.interests(id)
    ON DELETE CASCADE
);

-- 3) fiction_interests (junction)
CREATE TABLE IF NOT EXISTS public.fiction_interests (
  fiction_id UUID NOT NULL,
  interest_id UUID NOT NULL,
  weight     SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fiction_interests_pkey PRIMARY KEY (fiction_id, interest_id),
  CONSTRAINT fiction_interests_fiction_id_fkey
    FOREIGN KEY (fiction_id) REFERENCES public.fictions(id)
    ON DELETE CASCADE,
  CONSTRAINT fiction_interests_interest_id_fkey
    FOREIGN KEY (interest_id) REFERENCES public.interests(id)
    ON DELETE CASCADE
);

-- 4) user_interests (junction)
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id     UUID NOT NULL,
  interest_id UUID NOT NULL,
  source      TEXT NOT NULL DEFAULT 'onboarding',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_interests_pkey PRIMARY KEY (user_id, interest_id),
  CONSTRAINT user_interests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT user_interests_interest_id_fkey
    FOREIGN KEY (interest_id) REFERENCES public.interests(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiction_interests_interest_id ON public.fiction_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_fiction_interests_fiction_id  ON public.fiction_interests(fiction_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest_id  ON public.user_interests(interest_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id       ON public.user_interests(user_id);

-- Grants (RLS still enforced)
GRANT SELECT ON public.interests TO anon, authenticated;
GRANT SELECT ON public.interest_translations TO anon, authenticated;
GRANT SELECT ON public.fiction_interests TO anon, authenticated;

-- Allow authenticated users to create their own onboarding selections.
GRANT SELECT, INSERT, DELETE ON public.user_interests TO authenticated;

-- Allow authenticated users to write fiction_interests (admin UI will run as authenticated).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiction_interests TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.interest_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_translations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.fiction_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiction_interests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests FORCE ROW LEVEL SECURITY;

-- interests: anyone can read
DROP POLICY IF EXISTS "interests: anyone can read" ON public.interests;
CREATE POLICY "interests: anyone can read"
  ON public.interests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- interest_translations: anyone can read
DROP POLICY IF EXISTS "interest_translations: anyone can read" ON public.interest_translations;
CREATE POLICY "interest_translations: anyone can read"
  ON public.interest_translations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- fiction_interests: anyone can read, authenticated can write (no additional admin role checks in this v1)
DROP POLICY IF EXISTS "fiction_interests: anyone can read" ON public.fiction_interests;
CREATE POLICY "fiction_interests: anyone can read"
  ON public.fiction_interests
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "fiction_interests: authenticated can write" ON public.fiction_interests;
CREATE POLICY "fiction_interests: authenticated can write"
  ON public.fiction_interests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- user_interests: user can read/write only their own rows
DROP POLICY IF EXISTS "user_interests: user can read own" ON public.user_interests;
CREATE POLICY "user_interests: user can read own"
  ON public.user_interests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_interests: user can insert own" ON public.user_interests;
CREATE POLICY "user_interests: user can insert own"
  ON public.user_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_interests: user can delete own" ON public.user_interests;
CREATE POLICY "user_interests: user can delete own"
  ON public.user_interests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

