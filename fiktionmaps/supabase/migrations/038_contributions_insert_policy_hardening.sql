-- Tighten INSERT policy: prevent self-approval or prefilling moderator fields.
-- Users can only insert pending contributions without moderator info or pre-awarded FPP.
DROP POLICY IF EXISTS "contributions: insert authenticated as self" ON public.contributions;

CREATE POLICY "contributions: insert authenticated as self"
  ON public.contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (status IS NULL OR status = 'pending')
    AND moderator_id IS NULL
    AND fpp_awarded IS NULL
  );
