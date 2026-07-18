-- Places created after 037 backfill (e.g. admin createPlaceAction) without a contribution row.
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
  p.created_by,
  'create_place'::public.contribution_type,
  'place'::public.contribution_entity_type,
  p.id,
  'approved'::public.contribution_status,
  13,
  NULL,
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, p.created_at, now())
FROM public.places p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.contributions c
    WHERE c.entity_type = 'place'::public.contribution_entity_type
      AND c.entity_id = p.id
  );
