-- Pending images: sm/lg are variants per role (not global per contribution).
-- Places add_photo: avatar → sm + lg. Fiction add_photo: cover → sm + lg, banner (hero) → lg.

ALTER TABLE public.contribution_pending_images
  DROP CONSTRAINT IF EXISTS contribution_pending_images_contribution_variant_key;

ALTER TABLE public.contribution_pending_images
  DROP CONSTRAINT IF EXISTS contribution_pending_images_role_check;

ALTER TABLE public.contribution_pending_images
  ADD CONSTRAINT contribution_pending_images_role_check
  CHECK (role IN ('avatar', 'hero', 'cover', 'banner'));

ALTER TABLE public.contribution_pending_images
  ADD CONSTRAINT contribution_pending_images_contribution_role_variant_key
  UNIQUE (contribution_id, role, variant);
