ALTER TABLE public.cities
  ADD COLUMN image_url text NULL;

COMMENT ON COLUMN public.cities.image_url IS 'URL of a representative photo for the city (used as hero image on the public city detail page).';
