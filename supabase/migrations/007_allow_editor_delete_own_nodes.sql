-- Allow editors to delete nodes they created, while preserving admin full delete rights.

DROP POLICY IF EXISTS "Admins can delete nodes" ON public.nodes;

CREATE POLICY "Editors can delete own nodes or admins can delete any"
  ON public.nodes FOR DELETE
  TO authenticated
  USING (
    public.is_graph_admin(graph_id)
    OR (
      public.is_graph_editor_or_admin(graph_id)
      AND created_by = auth.uid()
    )
  );
