-- Add 'contributor' role to profiles.role CHECK constraint.
-- Contributors can access experimental features (e.g. AI wizards) but are not staff:
-- they cannot moderate contributions or auto-approve their own submissions.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'contributor', 'admin', 'moderator'));
