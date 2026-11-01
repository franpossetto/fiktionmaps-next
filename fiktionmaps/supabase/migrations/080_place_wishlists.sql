-- Place wishlists (user → place). Travel intent; not likes, not check-ins.
-- v1 RLS: own rows only. No anon SELECT (no public list / counts yet).

CREATE TABLE IF NOT EXISTS public.place_wishlists (
  user_id     UUID        NOT NULL,
  place_id    UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT place_wishlists_pkey PRIMARY KEY (user_id, place_id),

  CONSTRAINT place_wishlists_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT place_wishlists_place_id_fkey
    FOREIGN KEY (place_id) REFERENCES public.places(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_place_wishlists_place_id ON public.place_wishlists(place_id);
CREATE INDEX IF NOT EXISTS idx_place_wishlists_user_id ON public.place_wishlists(user_id);

GRANT SELECT, INSERT, DELETE ON public.place_wishlists TO authenticated;

ALTER TABLE public.place_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_wishlists FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "place_wishlists: user can select own" ON public.place_wishlists;
CREATE POLICY "place_wishlists: user can select own"
  ON public.place_wishlists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "place_wishlists: user can insert own" ON public.place_wishlists;
CREATE POLICY "place_wishlists: user can insert own"
  ON public.place_wishlists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "place_wishlists: user can delete own" ON public.place_wishlists;
CREATE POLICY "place_wishlists: user can delete own"
  ON public.place_wishlists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
