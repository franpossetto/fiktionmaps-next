ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places FORCE ROW LEVEL SECURITY;

GRANT DELETE ON public.locations TO authenticated;
GRANT DELETE ON public.places TO authenticated;

-- Locations policies
CREATE POLICY "locations: anyone can read"
  ON public.locations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "locations: authenticated can insert"
  ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "locations: authenticated can update"
  ON public.locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "locations: authenticated can delete"
  ON public.locations
  FOR DELETE
  TO authenticated
  USING (true);

-- Places policies
CREATE POLICY "places: anyone can read"
  ON public.places
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "places: authenticated can insert"
  ON public.places
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "places: authenticated can update"
  ON public.places
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "places: authenticated can delete"
  ON public.places
  FOR DELETE
  TO authenticated
  USING (true);
