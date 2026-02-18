-- Memories & Media Schema
-- Stories, photos, and documents attached to family members

-- ==================
-- Memories
-- ==================
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public.graphs(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.nodes(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('story', 'photo', 'document', 'milestone')),
  title TEXT,
  content TEXT, -- story text or caption
  media_url TEXT, -- Supabase Storage URL
  media_type TEXT, -- 'image/jpeg', 'image/png', 'application/pdf', etc.
  event_date DATE, -- when the memory happened
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memories_graph ON public.memories(graph_id);
CREATE INDEX idx_memories_node ON public.memories(node_id);
CREATE INDEX idx_memories_author ON public.memories(author_id);
CREATE INDEX idx_memories_date ON public.memories(event_date DESC NULLS LAST);

-- ==================
-- Memory Comments
-- ==================
CREATE TABLE public.memory_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memory_comments ON public.memory_comments(memory_id, created_at);

-- ==================
-- Memory Likes
-- ==================
CREATE TABLE public.memory_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(memory_id, user_id)
);

-- ==================
-- RLS Policies
-- ==================

-- Memories: viewable by graph members
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Graph members can view memories"
  ON public.memories FOR SELECT
  USING (public.is_graph_member(graph_id));

CREATE POLICY "Graph members can create memories"
  ON public.memories FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND public.is_graph_member(graph_id)
  );

CREATE POLICY "Authors can update their memories"
  ON public.memories FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their memories"
  ON public.memories FOR DELETE
  USING (author_id = auth.uid());

-- Memory comments
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Graph members can view comments"
  ON public.memory_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_graph_member(m.graph_id)
    )
  );

CREATE POLICY "Graph members can comment"
  ON public.memory_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_graph_member(m.graph_id)
    )
  );

-- Memory likes
ALTER TABLE public.memory_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own likes"
  ON public.memory_likes FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Graph members can view likes"
  ON public.memory_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_graph_member(m.graph_id)
    )
  );

-- ==================
-- Supabase Storage bucket (run separately via dashboard or function)
-- ==================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', false);
-- CREATE POLICY "Graph members can upload" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'memories' AND auth.role() = 'authenticated');
-- CREATE POLICY "Graph members can read" ON storage.objects FOR SELECT
--   USING (bucket_id = 'memories' AND auth.role() = 'authenticated');
