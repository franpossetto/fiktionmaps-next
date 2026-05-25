-- Revert 044: staff-only write blocked contributors saving Street View on contribute.
-- Restores 042 write policy until a tighter policy (staff + own pending place) exists.
DROP POLICY IF EXISTS "location_view_references: staff can write" ON public.location_view_references;
DROP POLICY IF EXISTS "location_view_references: authenticated can write" ON public.location_view_references;
CREATE POLICY "location_view_references: authenticated can write"
  ON public.location_view_references
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
