-- Contribution type + staging for moderated "add credit (person + role) to fiction" proposals.
-- Approve upserts fiction_persons; reject only clears staging (not a create-entity type).

ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'add_credits';

CREATE TABLE public.contribution_pending_fiction_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  role text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_pending_fiction_persons_contribution_unique UNIQUE (contribution_id),
  CONSTRAINT contribution_pending_fiction_persons_role_nonempty CHECK (char_length(trim(role)) > 0)
);

CREATE INDEX contribution_pending_fiction_persons_person_id_idx
  ON public.contribution_pending_fiction_persons (person_id);

COMMENT ON TABLE public.contribution_pending_fiction_persons IS
  'Staging fiction credit for add_credits until moderator approval; applied via fiction_persons on approve.';

ALTER TABLE public.contribution_pending_fiction_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_pending_fiction_persons FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.contribution_pending_fiction_persons TO authenticated;

CREATE POLICY "contribution_pending_fiction_persons: select own contribution or staff"
  ON public.contribution_pending_fiction_persons
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

CREATE POLICY "contribution_pending_fiction_persons: insert own pending contribution"
  ON public.contribution_pending_fiction_persons
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

CREATE POLICY "contribution_pending_fiction_persons: delete staff"
  ON public.contribution_pending_fiction_persons
  FOR DELETE
  TO authenticated
  USING (public.is_staff_profile());
