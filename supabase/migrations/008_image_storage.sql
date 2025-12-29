-- Create storage bucket for tour images
-- Note: This needs to be run in Supabase dashboard or via API
-- Storage buckets cannot be created via SQL migrations directly

-- The bucket should be created with:
-- - Name: 'tour-images'
-- - Public: true (so images can be accessed via public URLs)
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

-- Storage policies for authenticated users
-- These will be created via Supabase dashboard or API:

-- Policy: Users can upload their own images
-- CREATE POLICY "Users can upload own images"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'tour-images' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Policy: Users can view all images (public bucket)
-- CREATE POLICY "Public images are viewable"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'tour-images');

-- Policy: Users can update their own images
-- CREATE POLICY "Users can update own images"
--   ON storage.objects FOR UPDATE
--   TO authenticated
--   USING (
--     bucket_id = 'tour-images' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Policy: Users can delete their own images
-- CREATE POLICY "Users can delete own images"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (
--     bucket_id = 'tour-images' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Instructions for setting up the bucket:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: tour-images
-- 4. Public bucket: Yes
-- 5. File size limit: 5242880 (5MB)
-- 6. Allowed MIME types: image/jpeg,image/jpg,image/png,image/webp,image/gif
-- 7. Create the bucket
-- 8. Go to Storage > tour-images > Policies
-- 9. Create the policies listed above

COMMENT ON SCHEMA storage IS 'Storage bucket tour-images must be created manually in Supabase dashboard';

