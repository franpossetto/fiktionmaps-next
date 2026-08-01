-- Allow signed-in viewers to read any member's interests (public profile).
-- Insert/delete remain own-only from 018_interests_tables.sql.

DROP POLICY IF EXISTS "user_interests: user can read own" ON public.user_interests;
DROP POLICY IF EXISTS "user_interests: authenticated can read" ON public.user_interests;

CREATE POLICY "user_interests: authenticated can read"
  ON public.user_interests
  FOR SELECT
  TO authenticated
  USING (true);
