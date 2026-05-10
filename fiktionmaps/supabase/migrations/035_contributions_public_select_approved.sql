-- Public read of approved contributions (anon + authenticated) for cached public pages.
GRANT SELECT ON public.contributions TO anon;

CREATE POLICY "contributions: select approved public"
  ON public.contributions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved'::public.contribution_status);
