-- Non-staff cannot insert fictions/places/scenes as approved (column default is approved).
-- BEFORE INSERT normalizes status; INSERT RLS requires pending for non-staff after normalization.

CREATE OR REPLACE FUNCTION public.force_entity_contribution_status_pending_for_non_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff_profile() THEN
    NEW.status := 'pending'::public.contribution_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fictions_contribution_status_insert ON public.fictions;
CREATE TRIGGER fictions_contribution_status_insert
  BEFORE INSERT ON public.fictions
  FOR EACH ROW
  EXECUTE FUNCTION public.force_entity_contribution_status_pending_for_non_staff();

DROP TRIGGER IF EXISTS places_contribution_status_insert ON public.places;
CREATE TRIGGER places_contribution_status_insert
  BEFORE INSERT ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.force_entity_contribution_status_pending_for_non_staff();

DROP TRIGGER IF EXISTS scenes_contribution_status_insert ON public.scenes;
CREATE TRIGGER scenes_contribution_status_insert
  BEFORE INSERT ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.force_entity_contribution_status_pending_for_non_staff();

DROP POLICY IF EXISTS "fictions: authenticated can insert" ON public.fictions;
CREATE POLICY "fictions: authenticated can insert"
  ON public.fictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_profile()
    OR status = 'pending'::public.contribution_status
  );

DROP POLICY IF EXISTS "places: authenticated can insert" ON public.places;
CREATE POLICY "places: authenticated can insert"
  ON public.places
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_profile()
    OR status = 'pending'::public.contribution_status
  );

DROP POLICY IF EXISTS "scenes: authenticated can insert" ON public.scenes;
CREATE POLICY "scenes: authenticated can insert"
  ON public.scenes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff_profile()
    OR status = 'pending'::public.contribution_status
  );
