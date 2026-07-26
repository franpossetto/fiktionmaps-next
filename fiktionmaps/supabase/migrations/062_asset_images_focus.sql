-- Focal point for object-position (percent 0–100). Same value on all variants of a role.
ALTER TABLE public.asset_images
  ADD COLUMN IF NOT EXISTS focus_x double precision NOT NULL DEFAULT 50
    CHECK (focus_x >= 0 AND focus_x <= 100),
  ADD COLUMN IF NOT EXISTS focus_y double precision NOT NULL DEFAULT 50
    CHECK (focus_y >= 0 AND focus_y <= 100);

ALTER TABLE public.contribution_pending_images
  ADD COLUMN IF NOT EXISTS focus_x double precision NOT NULL DEFAULT 50
    CHECK (focus_x >= 0 AND focus_x <= 100),
  ADD COLUMN IF NOT EXISTS focus_y double precision NOT NULL DEFAULT 50
    CHECK (focus_y >= 0 AND focus_y <= 100);

COMMENT ON COLUMN public.asset_images.focus_x IS
  'Horizontal focal point percent (0–100) for CSS object-position; shared across variants of the same role.';
COMMENT ON COLUMN public.asset_images.focus_y IS
  'Vertical focal point percent (0–100) for CSS object-position; shared across variants of the same role.';
