ALTER TABLE public.asset_images
  DROP CONSTRAINT IF EXISTS asset_images_entity_type_check;

ALTER TABLE public.asset_images
  ADD CONSTRAINT asset_images_entity_type_check
  CHECK (entity_type IN ('fiction', 'city', 'location', 'scene', 'profile', 'place'));

