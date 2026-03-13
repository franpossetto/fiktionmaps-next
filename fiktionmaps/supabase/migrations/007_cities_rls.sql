ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cities FORCE ROW LEVEL SECURITY;

CREATE POLICY "cities: anyone can read"
  ON public.cities
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "cities: authenticated can insert"
  ON public.cities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "cities: authenticated can update"
  ON public.cities
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
