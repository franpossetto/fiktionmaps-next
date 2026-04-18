-- Delete policy for fictions (moved from 005 so it can be applied after 005 was already run).
DROP POLICY IF EXISTS "fictions: authenticated can delete" ON public.fictions;
CREATE POLICY "fictions: authenticated can delete"
  ON public.fictions
  FOR DELETE
  TO authenticated
  USING (true);
