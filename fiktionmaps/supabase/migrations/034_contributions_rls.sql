-- Staff helper: readable under FORCE RLS on profiles (role lookup for current JWT user).
CREATE OR REPLACE FUNCTION public.is_staff_profile()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'moderator')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_profile() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- contributions
-- ---------------------------------------------------------------------------
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.contributions TO authenticated;

CREATE POLICY "contributions: select own or staff sees all"
  ON public.contributions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_staff_profile()
  );

CREATE POLICY "contributions: insert authenticated as self"
  ON public.contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "contributions: update staff only"
  ON public.contributions
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

CREATE OR REPLACE FUNCTION public.contributions_immutable_core_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id IS DISTINCT FROM NEW.user_id
    OR OLD.entity_id IS DISTINCT FROM NEW.entity_id
    OR OLD.entity_type IS DISTINCT FROM NEW.entity_type
    OR OLD.type IS DISTINCT FROM NEW.type
  THEN
    RAISE EXCEPTION 'Contribution type, entity and author cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contributions_immutable_core_fields ON public.contributions;
CREATE TRIGGER contributions_immutable_core_fields
  BEFORE UPDATE ON public.contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.contributions_immutable_core_fields();

-- ---------------------------------------------------------------------------
-- fictions / places / scenes — SELECT by contribution status; status UPDATE staff-only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "fictions: anyone can read" ON public.fictions;
CREATE POLICY "fictions: select by status creator or staff"
  ON public.fictions
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'::public.contribution_status
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND created_by IS NOT NULL
      AND created_by = (SELECT auth.uid())
    )
    OR public.is_staff_profile()
  );

DROP POLICY IF EXISTS "places: anyone can read" ON public.places;
CREATE POLICY "places: select by status creator or staff"
  ON public.places
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'::public.contribution_status
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND created_by IS NOT NULL
      AND created_by = (SELECT auth.uid())
    )
    OR public.is_staff_profile()
  );

DROP POLICY IF EXISTS "scenes: anyone can read" ON public.scenes;
CREATE POLICY "scenes: select by status creator or staff"
  ON public.scenes
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'::public.contribution_status
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND created_by IS NOT NULL
      AND created_by = (SELECT auth.uid())
    )
    OR public.is_staff_profile()
  );

CREATE OR REPLACE FUNCTION public.enforce_entity_contribution_status_staff_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
    AND NOT public.is_staff_profile()
  THEN
    RAISE EXCEPTION 'Only staff can change status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fictions_contribution_status_staff ON public.fictions;
CREATE TRIGGER fictions_contribution_status_staff
  BEFORE UPDATE ON public.fictions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_entity_contribution_status_staff_only();

DROP TRIGGER IF EXISTS places_contribution_status_staff ON public.places;
CREATE TRIGGER places_contribution_status_staff
  BEFORE UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_entity_contribution_status_staff_only();

DROP TRIGGER IF EXISTS scenes_contribution_status_staff ON public.scenes;
CREATE TRIGGER scenes_contribution_status_staff
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_entity_contribution_status_staff_only();

-- ---------------------------------------------------------------------------
-- profiles — lectura pública; staff puede actualizar cualquier fila (moderación FPP)
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "profiles: users can view own" ON public.profiles;
CREATE POLICY "profiles: public select"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles: staff can update any"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

CREATE OR REPLACE FUNCTION public.enforce_profile_fpp_level_staff_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.fpp_total IS DISTINCT FROM OLD.fpp_total
    OR NEW.level IS DISTINCT FROM OLD.level
  )
    AND NOT public.is_staff_profile()
  THEN
    RAISE EXCEPTION 'Only staff can change fpp_total or level';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_fpp_level_staff_only ON public.profiles;
CREATE TRIGGER profiles_fpp_level_staff_only
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_fpp_level_staff_only();
