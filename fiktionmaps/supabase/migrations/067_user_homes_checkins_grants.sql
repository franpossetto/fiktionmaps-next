-- Privileges for user-scoped home/checkin tables (RLS still enforced).
-- These tables had policies but no explicit GRANTs for the authenticated role.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_homes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_checkins TO authenticated;
