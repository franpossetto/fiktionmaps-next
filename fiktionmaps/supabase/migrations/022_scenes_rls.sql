ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scenes: anyone can read" ON public.scenes;
CREATE POLICY "scenes: anyone can read"
  ON public.scenes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "scenes: authenticated can insert" ON public.scenes;
CREATE POLICY "scenes: authenticated can insert"
  ON public.scenes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "scenes: authenticated can update" ON public.scenes;
CREATE POLICY "scenes: authenticated can update"
  ON public.scenes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "scenes: authenticated can delete" ON public.scenes;
CREATE POLICY "scenes: authenticated can delete"
  ON public.scenes
  FOR DELETE
  TO authenticated
  USING (true);
