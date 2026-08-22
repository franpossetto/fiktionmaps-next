-- Contribution type + staging for moderated place relationship proposals
-- (shared clone-to-fiction, or composite of two same-fiction places).
-- Approve applies via place_relationships (+ clone place for shared); reject clears staging.
-- Not a create-entity type (no status patch on places beyond the clone itself).

ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'link_place_relationship';

CREATE TABLE public.contribution_pending_place_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  -- shared_clone
  source_place_id uuid NULL REFERENCES public.places(id) ON DELETE CASCADE,
  target_fiction_id uuid NULL REFERENCES public.fictions(id) ON DELETE CASCADE,
  place_name text NULL,
  description text NULL,
  relation_kind public.place_relation_kind NULL,
  shoot_environment public.place_shoot_environment NULL,
  relationship_name text NULL,
  -- composite
  place_a_id uuid NULL REFERENCES public.places(id) ON DELETE CASCADE,
  place_b_id uuid NULL REFERENCES public.places(id) ON DELETE CASCADE,
  group_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_pending_place_relationships_contribution_unique UNIQUE (contribution_id),
  CONSTRAINT contribution_pending_place_relationships_kind_check
    CHECK (kind IN ('shared_clone', 'composite')),
  CONSTRAINT contribution_pending_place_relationships_shared_clone_fields CHECK (
    kind <> 'shared_clone'
    OR (
      source_place_id IS NOT NULL
      AND target_fiction_id IS NOT NULL
      AND place_name IS NOT NULL
      AND char_length(trim(place_name)) > 0
      AND description IS NOT NULL
      AND char_length(trim(description)) > 0
    )
  ),
  CONSTRAINT contribution_pending_place_relationships_composite_fields CHECK (
    kind <> 'composite'
    OR (
      place_a_id IS NOT NULL
      AND place_b_id IS NOT NULL
      AND place_a_id <> place_b_id
      AND group_name IS NOT NULL
      AND char_length(trim(group_name)) > 0
    )
  )
);

CREATE INDEX contribution_pending_place_relationships_source_place_id_idx
  ON public.contribution_pending_place_relationships (source_place_id)
  WHERE source_place_id IS NOT NULL;

CREATE INDEX contribution_pending_place_relationships_place_a_id_idx
  ON public.contribution_pending_place_relationships (place_a_id)
  WHERE place_a_id IS NOT NULL;

COMMENT ON TABLE public.contribution_pending_place_relationships IS
  'Staging payload for link_place_relationship until moderator approval.';

ALTER TABLE public.contribution_pending_place_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_pending_place_relationships FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.contribution_pending_place_relationships TO authenticated;

CREATE POLICY "contribution_pending_place_relationships: select own contribution or staff"
  ON public.contribution_pending_place_relationships
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

CREATE POLICY "contribution_pending_place_relationships: insert own pending contribution"
  ON public.contribution_pending_place_relationships
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

CREATE POLICY "contribution_pending_place_relationships: delete staff"
  ON public.contribution_pending_place_relationships
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
