-- Backfill: one approved create_place contribution per place without any contribution row yet.
INSERT INTO public.contributions (
  user_id,
  type,
  entity_type,
  entity_id,
  status,
  fpp_awarded,
  moderator_id,
  created_at,
  updated_at
)
SELECT
  'cc0bea1e-c8a3-4dc1-962d-b4fea67aa752'::uuid,
  'create_place'::public.contribution_type,
  'place'::public.contribution_entity_type,
  p.id,
  'approved'::public.contribution_status,
  13,
  NULL,
  COALESCE(p.updated_at, p.created_at, now()),
  COALESCE(p.updated_at, p.created_at, now())
FROM public.places p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contributions c
  WHERE c.entity_type = 'place'::public.contribution_entity_type
    AND c.entity_id = p.id
);
