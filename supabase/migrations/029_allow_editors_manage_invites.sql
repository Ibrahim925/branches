-- Allow editors (not only admins) to create and manage invite links.

DROP POLICY IF EXISTS "Graph admins can manage invites" ON public.invites;
DROP POLICY IF EXISTS "Editors or admins can manage invites" ON public.invites;

CREATE POLICY "Editors or admins can manage invites"
  ON public.invites FOR ALL
  TO authenticated
  USING (public.is_graph_editor_or_admin(graph_id))
  WITH CHECK (public.is_graph_editor_or_admin(graph_id));
