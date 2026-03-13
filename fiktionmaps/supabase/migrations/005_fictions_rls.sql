ALTER TABLE public.fictions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fictions FORCE ROW LEVEL SECURITY;

CREATE POLICY "fictions: anyone can read"
  ON public.fictions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "fictions: authenticated can insert"
  ON public.fictions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "fictions: authenticated can update"
  ON public.fictions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
