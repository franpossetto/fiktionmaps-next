-- place_relationships: declared links between places (shared / composite).
-- Invariant: 1 place ↔ 1 location (always clone location rows; never share location_id).
-- places.relation_kind is a different concept (place ↔ its fiction).

CREATE TYPE public.place_relationship_type AS ENUM ('shared', 'composite');

CREATE TABLE public.place_relationships (
  id         UUID                          NOT NULL DEFAULT gen_random_uuid(),
  type       public.place_relationship_type NOT NULL,
  name       TEXT                          NOT NULL,
  slug       TEXT                          NOT NULL,
  created_at TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
  CONSTRAINT place_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT place_relationships_slug_unique UNIQUE (slug),
  CONSTRAINT place_relationships_id_type_unique UNIQUE (id, type)
);

COMMENT ON TABLE public.place_relationships IS
  'Declared groups of related places. shared = same real site across fictions; composite = same fictional venue, different real points.';

CREATE TABLE public.place_relationship_members (
  id                    UUID                          NOT NULL DEFAULT gen_random_uuid(),
  place_relationship_id UUID                          NOT NULL,
  type                  public.place_relationship_type NOT NULL,
  place_id              UUID                          NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
  CONSTRAINT place_relationship_members_pkey PRIMARY KEY (id),
  CONSTRAINT place_relationship_members_unique UNIQUE (place_relationship_id, place_id),
  CONSTRAINT place_relationship_members_group_fkey
    FOREIGN KEY (place_relationship_id, type)
    REFERENCES public.place_relationships (id, type) ON DELETE CASCADE
);

COMMENT ON COLUMN public.place_relationship_members.type IS
  'Denormalized from place_relationships.type so partial unique indexes can enforce ≤1 membership per type per place.';

CREATE UNIQUE INDEX idx_place_rel_members_one_shared
  ON public.place_relationship_members (place_id) WHERE type = 'shared';
CREATE UNIQUE INDEX idx_place_rel_members_one_composite
  ON public.place_relationship_members (place_id) WHERE type = 'composite';
CREATE INDEX idx_place_rel_members_place
  ON public.place_relationship_members (place_id, place_relationship_id);

DROP TRIGGER IF EXISTS set_place_relationships_updated_at ON public.place_relationships;
CREATE TRIGGER set_place_relationships_updated_at
  BEFORE UPDATE ON public.place_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- After a member is removed (explicit or via place DELETE CASCADE), drop singleton / empty groups.
CREATE OR REPLACE FUNCTION public.place_relationships_prune_singleton()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*)::int
    FROM public.place_relationship_members m
    WHERE m.place_relationship_id = OLD.place_relationship_id
  ) < 2 THEN
    DELETE FROM public.place_relationships
    WHERE id = OLD.place_relationship_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_place_rel_members_prune_singleton ON public.place_relationship_members;
CREATE TRIGGER trg_place_rel_members_prune_singleton
  AFTER DELETE ON public.place_relationship_members
  FOR EACH ROW
  EXECUTE FUNCTION public.place_relationships_prune_singleton();

-- ---------------------------------------------------------------------------
-- RLS: public read; staff write (mirrors 057 / scene_places staff policies)
-- ---------------------------------------------------------------------------

ALTER TABLE public.place_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.place_relationship_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_relationship_members FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_relationships TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_relationship_members TO anon, authenticated;

DROP POLICY IF EXISTS "place_relationships: select all" ON public.place_relationships;
CREATE POLICY "place_relationships: select all"
  ON public.place_relationships
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "place_relationships: staff insert" ON public.place_relationships;
CREATE POLICY "place_relationships: staff insert"
  ON public.place_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "place_relationships: staff update" ON public.place_relationships;
CREATE POLICY "place_relationships: staff update"
  ON public.place_relationships
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "place_relationships: staff delete" ON public.place_relationships;
CREATE POLICY "place_relationships: staff delete"
  ON public.place_relationships
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());

DROP POLICY IF EXISTS "place_relationship_members: select all" ON public.place_relationship_members;
CREATE POLICY "place_relationship_members: select all"
  ON public.place_relationship_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "place_relationship_members: staff insert" ON public.place_relationship_members;
CREATE POLICY "place_relationship_members: staff insert"
  ON public.place_relationship_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "place_relationship_members: staff update" ON public.place_relationship_members;
CREATE POLICY "place_relationship_members: staff update"
  ON public.place_relationship_members
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_profile())
  WITH CHECK (public.is_staff_profile());

DROP POLICY IF EXISTS "place_relationship_members: staff delete" ON public.place_relationship_members;
CREATE POLICY "place_relationship_members: staff delete"
  ON public.place_relationship_members
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
