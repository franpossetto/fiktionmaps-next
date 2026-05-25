-- places.name NOT NULL, places.slug per fiction, fictions.slug NOT NULL

-- 1) Backfill place display names
UPDATE public.places p
SET name = COALESCE(NULLIF(trim(p.name), ''), l.name, 'Place')
FROM public.locations l
WHERE p.location_id = l.id
  AND (p.name IS NULL OR trim(p.name) = '');

UPDATE public.places
SET name = 'Place'
WHERE name IS NULL OR trim(name) = '';

ALTER TABLE public.places
  ALTER COLUMN name SET NOT NULL;

-- 2) places.slug (unique per fiction)
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  n int;
BEGIN
  FOR r IN
    SELECT id, fiction_id, name
    FROM public.places
    ORDER BY created_at ASC, id ASC
  LOOP
    base_slug := lower(
      regexp_replace(
        regexp_replace(trim(coalesce(r.name, 'place')), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      )
    );
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := replace(r.id::text, '-', '');
    END IF;

    candidate := base_slug;
    n := 2;
    WHILE EXISTS (
      SELECT 1
      FROM public.places
      WHERE fiction_id = r.fiction_id
        AND slug = candidate
        AND id <> r.id
    ) LOOP
      candidate := base_slug || '-' || n::text;
      n := n + 1;
    END LOOP;

    UPDATE public.places SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.places
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS places_fiction_id_slug_key
  ON public.places (fiction_id, slug);

-- 3) All fictions already have slug; enforce NOT NULL
ALTER TABLE public.fictions
  ALTER COLUMN slug SET NOT NULL;
