-- Username must be unique across profiles (multiple NULLs allowed).
-- Enables validation by attempting UPDATE and handling unique_violation (23505).

-- Store the user's full display name from auth alongside the username.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Ensure usernames are unique (case-insensitive, trimmed) when present.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (LOWER(TRIM(username)))
  WHERE username IS NOT NULL AND TRIM(username) <> '';

-- RPC: check if a username is available (not taken by another user).
-- Call before letting the user move forward; write still validated by unique constraint.
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  normalized text;
  taken boolean;
BEGIN
  normalized := LOWER(TRIM(COALESCE(p_username, '')));
  IF normalized = '' THEN
    RETURN true;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(TRIM(username)) = normalized
      AND username IS NOT NULL
      AND TRIM(username) <> ''
      AND id IS DISTINCT FROM auth.uid()
  ) INTO taken;
  RETURN NOT taken;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO service_role;
