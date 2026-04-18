-- Add active column for soft delete / visibility. Inactive fictions do not appear in search.
-- Default true for existing rows. Application layer sets active on create (default active).
ALTER TABLE public.fictions
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
