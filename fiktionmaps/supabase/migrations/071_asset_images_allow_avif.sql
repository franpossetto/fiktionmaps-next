-- Allow AVIF objects in the asset-images bucket (admin uploads encode as AVIF).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'image/avif']::text[]
WHERE id = 'asset-images';
