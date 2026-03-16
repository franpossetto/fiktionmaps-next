ALTER TABLE public.asset_images ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.asset_images FORCE ROW LEVEL SECURITY;

-- Anyone can read asset images (public URLs for fictions, etc.)
CREATE POLICY "asset_images: anyone can read"
  ON public.asset_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert/update/delete (admin or owner checks can be added later per entity_type)
CREATE POLICY "asset_images: authenticated can insert"
  ON public.asset_images
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "asset_images: authenticated can update"
  ON public.asset_images
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "asset_images: authenticated can delete"
  ON public.asset_images
  FOR DELETE
  TO authenticated
  USING (true);
