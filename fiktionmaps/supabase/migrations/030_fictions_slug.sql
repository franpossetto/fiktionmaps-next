-- Add slug column to fictions table
ALTER TABLE public.fictions
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Index for fast lookup by slug
CREATE UNIQUE INDEX IF NOT EXISTS fictions_slug_idx ON public.fictions (slug);
