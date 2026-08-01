-- Public city slugs: unique, required. Backfill provisional {name}-{country}.

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
DECLARE
  r RECORD;
  city_seg text;
  country_seg text;
  base_slug text;
  candidate text;
  n int;
BEGIN
  FOR r IN
    SELECT id, name, country
    FROM public.cities
    WHERE slug IS NULL OR trim(slug) = ''
    ORDER BY created_at ASC, id ASC
  LOOP
    city_seg := lower(
      regexp_replace(
        regexp_replace(trim(coalesce(r.name, 'city')), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      )
    );
    country_seg := lower(
      regexp_replace(
        regexp_replace(trim(coalesce(r.country, 'country')), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      )
    );

    IF city_seg IS NULL OR city_seg = '' THEN
      city_seg := 'city';
    END IF;
    IF country_seg IS NULL OR country_seg = '' THEN
      country_seg := 'country';
    END IF;

    base_slug := city_seg || '-' || country_seg;
    candidate := base_slug;
    n := 2;

    WHILE EXISTS (
      SELECT 1
      FROM public.cities
      WHERE slug = candidate
        AND id <> r.id
    ) LOOP
      candidate := base_slug || '-' || n::text;
      n := n + 1;
    END LOOP;

    UPDATE public.cities SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.cities
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_key
  ON public.cities (slug);
