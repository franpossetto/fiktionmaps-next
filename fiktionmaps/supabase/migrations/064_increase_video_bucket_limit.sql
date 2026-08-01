-- Increase asset-videos bucket file size limit to 500 MB
UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'asset-videos';
