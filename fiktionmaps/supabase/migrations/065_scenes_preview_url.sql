-- Lightweight looping MP4 used in feeds/lists (client-compressed "preview" variant).
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS preview_url text;

COMMENT ON COLUMN public.scenes.preview_url IS
  'Public URL of low-res muted preview MP4 in asset-videos; null for legacy rows (UI falls back to video_url).';
