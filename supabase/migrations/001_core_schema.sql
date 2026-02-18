-- Branches Core Schema
-- Profiles, Graphs, Memberships, Nodes, Edges

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Profiles (syncs with auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Graphs (family tree instances)
-- ============================================
CREATE TABLE graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User-Graph Memberships
-- ============================================
CREATE TABLE user_graph_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'editor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, graph_id)
);

-- ============================================
-- Nodes (individuals in the tree)
-- ============================================
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birthdate DATE,
  death_date DATE,
  bio TEXT,
  avatar_url TEXT,
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  x FLOAT,
  y FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_nodes_graph ON nodes(graph_id);
CREATE INDEX idx_nodes_claimed ON nodes(claimed_by) WHERE claimed_by IS NOT NULL;

-- ============================================
-- Edges (relationships)
-- ============================================
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('parent_child', 'partnership')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(source_id, target_id, type)
);

CREATE INDEX idx_edges_graph ON edges(graph_id);
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);

-- ============================================
-- Helper functions (SECURITY DEFINER bypasses RLS)
-- These prevent infinite recursion when policies
-- on user_graph_memberships reference themselves.
-- ============================================

CREATE OR REPLACE FUNCTION public.is_graph_member(_graph_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_graph_memberships
    WHERE graph_id = _graph_id AND profile_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_graph_admin(_graph_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_graph_memberships
    WHERE graph_id = _graph_id AND profile_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_graph_editor_or_admin(_graph_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_graph_memberships
    WHERE graph_id = _graph_id AND profile_id = auth.uid() AND role IN ('admin', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graph_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Graphs
CREATE POLICY "Graphs viewable by members"
  ON graphs FOR SELECT
  TO authenticated
  USING (public.is_graph_member(id) OR created_by = auth.uid());

CREATE POLICY "Users can create graphs"
  ON graphs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can modify graphs"
  ON graphs FOR UPDATE
  TO authenticated
  USING (public.is_graph_admin(id));

-- User-Graph Memberships (no self-referencing — uses helper functions)
CREATE POLICY "Users can view memberships for their graphs"
  ON user_graph_memberships FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_graph_member(graph_id)
  );

CREATE POLICY "Users can create their own membership or admins can add others"
  ON user_graph_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR public.is_graph_admin(graph_id)
  );

-- Nodes
CREATE POLICY "Nodes viewable by graph members"
  ON nodes FOR SELECT
  TO authenticated
  USING (public.is_graph_member(graph_id));

CREATE POLICY "Editors can create nodes"
  ON nodes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_graph_editor_or_admin(graph_id));

CREATE POLICY "Editors can update nodes"
  ON nodes FOR UPDATE
  TO authenticated
  USING (public.is_graph_editor_or_admin(graph_id));

CREATE POLICY "Admins can delete nodes"
  ON nodes FOR DELETE
  TO authenticated
  USING (public.is_graph_admin(graph_id));

-- Edges
CREATE POLICY "Edges viewable by graph members"
  ON edges FOR SELECT
  TO authenticated
  USING (public.is_graph_member(graph_id));

CREATE POLICY "Editors can create edges"
  ON edges FOR INSERT
  TO authenticated
  WITH CHECK (public.is_graph_editor_or_admin(graph_id));

CREATE POLICY "Editors can delete edges"
  ON edges FOR DELETE
  TO authenticated
  USING (public.is_graph_editor_or_admin(graph_id));

-- ============================================
-- Enable Realtime for key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE edges;
