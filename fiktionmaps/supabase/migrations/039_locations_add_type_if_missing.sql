-- Ensure locations.type exists. Migration 014 declared it via CREATE TABLE IF NOT EXISTS,
-- so environments where the table predated 014 never got this column, breaking embed
-- selects like `locations(..., type)` from places.
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS type TEXT;
