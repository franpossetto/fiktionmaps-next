-- Application role: user | admin (extend enum later if needed)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.profiles.role IS 'Application role; only promotable with service role or DB superuser (auth.uid() null).';

-- Prevent authenticated users from changing their own role via the API (JWT present).
CREATE OR REPLACE FUNCTION public.profiles_preserve_role_for_authenticated()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_preserve_role ON public.profiles;

CREATE TRIGGER profiles_preserve_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_preserve_role_for_authenticated();
