-- SceneGuard (+ places/fictions/locations): only staff may UPDATE/DELETE article entities.
-- INSERT remains open for authenticated (pending enforced by 041); SELECT by status (034).

-- ---------------------------------------------------------------------------
-- scenes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "scenes: authenticated can update" ON public.scenes;
CREATE POLICY "scenes: staff can update"
  ON public.scenes
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "scenes: authenticated can delete" ON public.scenes;
CREATE POLICY "scenes: staff can delete"
  ON public.scenes
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());

-- ---------------------------------------------------------------------------
-- places
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "places: authenticated can update" ON public.places;
CREATE POLICY "places: staff can update"
  ON public.places
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "places: authenticated can delete" ON public.places;
CREATE POLICY "places: staff can delete"
  ON public.places
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());

-- ---------------------------------------------------------------------------
-- locations (place updates mutate location rows)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "locations: authenticated can update" ON public.locations;
CREATE POLICY "locations: staff can update"
  ON public.locations
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "locations: authenticated can delete" ON public.locations;
CREATE POLICY "locations: staff can delete"
  ON public.locations
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());

-- ---------------------------------------------------------------------------
-- fictions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "fictions: authenticated can update" ON public.fictions;
CREATE POLICY "fictions: staff can update"
  ON public.fictions
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "fictions: authenticated can delete" ON public.fictions;
CREATE POLICY "fictions: staff can delete"
  ON public.fictions
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
