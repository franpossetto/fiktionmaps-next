-- asset_images: one row per (entity_type, entity_id, role, variant)
CREATE TABLE public.asset_images (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type  TEXT        NOT NULL CHECK (entity_type IN ('fiction', 'city', 'location', 'scene', 'profile')),
  entity_id    UUID        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('cover', 'banner', 'avatar', 'hero')),
  variant      TEXT        NOT NULL CHECK (variant IN ('sm', 'lg', 'xl')),
  url          TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT asset_images_entity_role_variant_key UNIQUE (entity_type, entity_id, role, variant)
);

CREATE INDEX idx_asset_images_entity ON public.asset_images (entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_images TO anon, authenticated;
