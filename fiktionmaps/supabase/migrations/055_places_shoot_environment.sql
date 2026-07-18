CREATE TYPE place_shoot_environment AS ENUM (
  'interior',
  'exterior',
  'interior_exterior'
);

ALTER TABLE public.places
  ADD COLUMN shoot_environment place_shoot_environment NULL DEFAULT NULL;
