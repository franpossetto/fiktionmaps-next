-- Harden asset-images writes for profile avatars: only the owner may write under
-- profile/{auth.uid()}/… . Other entity paths keep the previous authenticated write
-- behavior until a broader storage hardening pass.

DROP POLICY IF EXISTS "asset-images: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "asset-images: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "asset-images: authenticated delete" ON storage.objects;

-- Non-profile paths: any authenticated user (existing fiction/place/scene behavior).
CREATE POLICY "asset-images: authenticated upload non-profile"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'profile'
  );

CREATE POLICY "asset-images: authenticated update non-profile"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'profile'
  )
  WITH CHECK (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'profile'
  );

CREATE POLICY "asset-images: authenticated delete non-profile"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] IS DISTINCT FROM 'profile'
  );

-- Profile paths: owner only (folder layout: profile/{userId}/avatar/…).
CREATE POLICY "asset-images: profile owner upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] = 'profile'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "asset-images: profile owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] = 'profile'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] = 'profile'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "asset-images: profile owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'asset-images'
    AND (storage.foldername(name))[1] = 'profile'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
