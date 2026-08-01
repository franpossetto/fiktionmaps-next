-- Contribution type + staging for moderated "link place to existing scene" proposals.
-- Approve applies linkPlace; reject only clears staging (not a create-entity type).

ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'add_place_to_scene';

CREATE TABLE public.contribution_pending_scene_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  start_second double precision NULL,
  end_second double precision NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_pending_scene_places_contribution_unique UNIQUE (contribution_id),
  CONSTRAINT contribution_pending_scene_places_start_non_negative
    CHECK (start_second IS NULL OR start_second >= 0),
  CONSTRAINT contribution_pending_scene_places_end_after_start
    CHECK (
      start_second IS NULL
      OR end_second IS NULL
      OR end_second > start_second
    )
);

CREATE INDEX contribution_pending_scene_places_place_id_idx
  ON public.contribution_pending_scene_places (place_id);

COMMENT ON TABLE public.contribution_pending_scene_places IS
  'Staging place link for add_place_to_scene until moderator approval; applied via scene_places on approve.';

ALTER TABLE public.contribution_pending_scene_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_pending_scene_places FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.contribution_pending_scene_places TO authenticated;

CREATE POLICY "contribution_pending_scene_places: select own contribution or staff"
  ON public.contribution_pending_scene_places
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      WHERE c.id = contribution_id
        AND (c.user_id = (SELECT auth.uid()) OR public.is_staff_profile())
    )
  );

CREATE POLICY "contribution_pending_scene_places: insert own pending contribution"
  ON public.contribution_pending_scene_places
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      WHERE c.id = contribution_id
        AND c.user_id = (SELECT auth.uid())
        AND c.status = 'pending'
    )
  );

CREATE POLICY "contribution_pending_scene_places: delete staff"
  ON public.contribution_pending_scene_places
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
