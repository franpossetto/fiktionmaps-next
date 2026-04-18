-- Dedicated bucket for scene video clips (separate from asset-images).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-videos',
  'asset-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "asset-videos: public read" ON storage.objects;
CREATE POLICY "asset-videos: public read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'asset-videos');

DROP POLICY IF EXISTS "asset-videos: authenticated upload" ON storage.objects;
CREATE POLICY "asset-videos: authenticated upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'asset-videos');

DROP POLICY IF EXISTS "asset-videos: authenticated update" ON storage.objects;
CREATE POLICY "asset-videos: authenticated update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'asset-videos')
  WITH CHECK (bucket_id = 'asset-videos');

DROP POLICY IF EXISTS "asset-videos: authenticated delete" ON storage.objects;
CREATE POLICY "asset-videos: authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'asset-videos');
