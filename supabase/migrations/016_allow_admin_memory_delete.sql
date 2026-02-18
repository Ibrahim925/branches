-- Allow tree admins to delete memories in their tree.

DROP POLICY IF EXISTS "Authors can delete their memories" ON public.memories;

CREATE POLICY "Authors or admins can delete memories"
  ON public.memories
  FOR DELETE
  USING (
    author_id = auth.uid()
    OR public.is_graph_admin(graph_id)
  );
