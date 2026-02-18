-- Enable full graph settings management for admins.

DROP POLICY IF EXISTS "Admins can update memberships" ON public.user_graph_memberships;
CREATE POLICY "Admins can update memberships"
  ON public.user_graph_memberships
  FOR UPDATE
  TO authenticated
  USING (public.is_graph_admin(graph_id))
  WITH CHECK (public.is_graph_admin(graph_id));

DROP POLICY IF EXISTS "Admins can remove memberships" ON public.user_graph_memberships;
CREATE POLICY "Admins can remove memberships"
  ON public.user_graph_memberships
  FOR DELETE
  TO authenticated
  USING (public.is_graph_admin(graph_id));

DROP POLICY IF EXISTS "Admins can delete graphs" ON public.graphs;
CREATE POLICY "Admins can delete graphs"
  ON public.graphs
  FOR DELETE
  TO authenticated
  USING (public.is_graph_admin(id));
