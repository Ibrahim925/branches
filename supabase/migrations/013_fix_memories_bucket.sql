-- Ensure memories storage bucket exists and is accessible to graph members.

INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Graph members can upload memories media" ON storage.objects;
CREATE POLICY "Graph members can upload memories media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'memories'
    AND public.can_access_graph_storage_object(name)
  );

DROP POLICY IF EXISTS "Graph members can read memories media" ON storage.objects;
CREATE POLICY "Graph members can read memories media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'memories'
    AND public.can_access_graph_storage_object(name)
  );

DROP POLICY IF EXISTS "Graph members can delete memories media" ON storage.objects;
CREATE POLICY "Graph members can delete memories media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'memories'
    AND public.can_access_graph_storage_object(name)
  );
