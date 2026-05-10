-- Backfill: one approved create_fiction contribution per fiction without any contribution row yet.
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
  '7df19874-5326-4205-93f7-08a4285f4530'::uuid,
  'create_fiction'::public.contribution_type,
  'fiction'::public.contribution_entity_type,
  f.id,
  'approved'::public.contribution_status,
  5,
  NULL,
  COALESCE(f.updated_at, f.created_at, now()),
  COALESCE(f.updated_at, f.created_at, now())
FROM public.fictions f
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contributions c
  WHERE c.entity_type = 'fiction'::public.contribution_entity_type
    AND c.entity_id = f.id
);
