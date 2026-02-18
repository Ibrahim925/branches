-- Ensure profile avatars can be rendered by image loaders without auth headers.

DROP POLICY IF EXISTS "Authenticated users can view profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile avatars" ON storage.objects;

CREATE POLICY "Public can view profile avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-avatars');
