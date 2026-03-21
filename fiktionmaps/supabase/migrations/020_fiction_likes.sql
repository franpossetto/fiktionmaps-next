-- Fiction likes (user -> fiction)
-- Tracks which fictions a user likes.

CREATE TABLE IF NOT EXISTS public.fiction_likes (
  user_id     UUID        NOT NULL,
  fiction_id  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fiction_likes_pkey PRIMARY KEY (user_id, fiction_id),

  CONSTRAINT fiction_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT fiction_likes_fiction_id_fkey
    FOREIGN KEY (fiction_id) REFERENCES public.fictions(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiction_likes_fiction_id ON public.fiction_likes(fiction_id);
CREATE INDEX IF NOT EXISTS idx_fiction_likes_user_id    ON public.fiction_likes(user_id);

-- Grants (RLS still enforced)
GRANT SELECT ON public.fiction_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.fiction_likes TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.fiction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiction_likes FORCE ROW LEVEL SECURITY;

-- Public can read (used for like counts in the app).
DROP POLICY IF EXISTS "fiction_likes: anyone can read" ON public.fiction_likes;
CREATE POLICY "fiction_likes: anyone can read"
  ON public.fiction_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert/delete only their own rows.
DROP POLICY IF EXISTS "fiction_likes: user can insert own" ON public.fiction_likes;
CREATE POLICY "fiction_likes: user can insert own"
  ON public.fiction_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "fiction_likes: user can delete own" ON public.fiction_likes;
CREATE POLICY "fiction_likes: user can delete own"
  ON public.fiction_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

