-- Allow xs thumbnails on asset_images and pending contribution staging.

ALTER TABLE public.asset_images
  DROP CONSTRAINT IF EXISTS asset_images_variant_check;

ALTER TABLE public.asset_images
  ADD CONSTRAINT asset_images_variant_check
  CHECK (variant IN ('xs', 'sm', 'lg', 'xl'));

ALTER TABLE public.contribution_pending_images
  DROP CONSTRAINT IF EXISTS contribution_pending_images_variant_check;

ALTER TABLE public.contribution_pending_images
  ADD CONSTRAINT contribution_pending_images_variant_check
  CHECK (variant IN ('xs', 'sm', 'lg'));
