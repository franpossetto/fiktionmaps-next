-- Set profile username from auth.users.raw_user_meta_data.full_name on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name TEXT;
BEGIN
  display_name := NEW.raw_user_meta_data->>'full_name';
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NULLIF(TRIM(display_name), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
