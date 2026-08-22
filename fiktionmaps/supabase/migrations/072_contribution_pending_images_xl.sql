-- Allow xl staging on contribution pending images (page-sized variant).

ALTER TABLE public.contribution_pending_images
  DROP CONSTRAINT IF EXISTS contribution_pending_images_variant_check;

ALTER TABLE public.contribution_pending_images
  ADD CONSTRAINT contribution_pending_images_variant_check
  CHECK (variant IN ('xs', 'sm', 'lg', 'xl'));
