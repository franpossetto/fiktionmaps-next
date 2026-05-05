ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS name text CHECK (char_length(name) <= 80);
