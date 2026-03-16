-- Create bucket for entity image assets (fiction cover/banner, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  true,
  5242880,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read for asset-images bucket
CREATE POLICY "asset-images: public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'asset-images');

-- Authenticated users can upload (insert) to asset-images
CREATE POLICY "asset-images: authenticated upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'asset-images');

-- Authenticated users can update objects in asset-images
CREATE POLICY "asset-images: authenticated update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'asset-images')
  WITH CHECK (bucket_id = 'asset-images');

-- Authenticated users can delete from asset-images
CREATE POLICY "asset-images: authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'asset-images');
