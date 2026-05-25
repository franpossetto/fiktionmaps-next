-- Tighten write access on location_view_references (042 originally allowed any authenticated user).
DROP POLICY IF EXISTS "location_view_references: authenticated can write" ON public.location_view_references;
DROP POLICY IF EXISTS "location_view_references: staff can write" ON public.location_view_references;
CREATE POLICY "location_view_references: staff can write"
  ON public.location_view_references
  FOR ALL
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());
