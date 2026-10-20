-- =======================================================================================
-- ResearchHub AI: complete, idempotent Supabase setup
-- Run once in Supabase -> SQL Editor -> New query. Safe to re-run.
-- Supersedes supabase_schema.sql + migration_combined.sql and adds what they were missing:
--   * profiles table (+ auto-create trigger) used for plan tiers and member invites
--   * research_insights.user_id column the AI agents write to
--   * non-recursive RLS (the old workspace_members policy referenced itself -> "infinite recursion")
--   * indexes for every hot query path
--   * avatars storage bucket used by Settings
-- =======================================================================================

-- ---------------------------------------------------------------- Tables
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'freemium',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    authors TEXT[],
    abstract TEXT,
    published_date DATE,
    source_url TEXT,
    original_filename VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    qdrant_collection_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS research_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'summary', 'contradiction', 'research_gap'
    content TEXT NOT NULL,
    source_papers JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Older projects created research_insights without user_id, which made every agent insert fail
ALTER TABLE research_insights ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES research_insights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_comment_target_new CHECK (
        (paper_id IS NOT NULL AND insight_id IS NULL) OR
        (paper_id IS NULL AND insight_id IS NOT NULL)
    )
);

-- ---------------------------------------------------------------- Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_workspace_created ON papers(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_user_created ON papers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_workspace_created ON research_insights(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_workspace_id ON comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_paper_id ON comments(paper_id);
CREATE INDEX IF NOT EXISTS idx_comments_insight_id ON comments(insight_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ---------------------------------------------------------------- Profiles auto-provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users that signed up before the trigger existed
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- RLS helpers
-- SECURITY DEFINER functions bypass RLS internally, which breaks the policy recursion
-- (workspaces -> workspace_members -> workspace_members ...) the old policies triggered.
CREATE OR REPLACE FUNCTION public.can_access_workspace(ws_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM workspaces WHERE id = ws_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.workspace_role_in(ws_id UUID, roles TEXT[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM workspaces WHERE id = ws_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid() AND role = ANY(roles));
$$;

-- ---------------------------------------------------------------- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (id = auth.uid());

-- workspaces
DROP POLICY IF EXISTS "Users can only view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own and shared workspaces" ON workspaces;
CREATE POLICY "Users can view their own and shared workspaces" ON workspaces FOR SELECT
    USING (public.can_access_workspace(id));
DROP POLICY IF EXISTS "Users can insert their own workspaces" ON workspaces;
CREATE POLICY "Users can insert their own workspaces" ON workspaces FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
CREATE POLICY "Users can update their own workspaces" ON workspaces FOR UPDATE
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;
CREATE POLICY "Users can delete their own workspaces" ON workspaces FOR DELETE
    USING (auth.uid() = user_id);

-- papers
DROP POLICY IF EXISTS "Users can only view their own papers" ON papers;
DROP POLICY IF EXISTS "Users can view papers in their accessible workspaces" ON papers;
CREATE POLICY "Users can view papers in their accessible workspaces" ON papers FOR SELECT
    USING (user_id = auth.uid() OR public.can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "Users can insert their own papers" ON papers;
DROP POLICY IF EXISTS "Editors and Admins can insert papers" ON papers;
CREATE POLICY "Editors and Admins can insert papers" ON papers FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.workspace_role_in(workspace_id, ARRAY['admin', 'editor']));
DROP POLICY IF EXISTS "Users can delete their own papers" ON papers;
CREATE POLICY "Users can delete their own papers" ON papers FOR DELETE
    USING (auth.uid() = user_id);

-- research_insights
DROP POLICY IF EXISTS "Users can only view insights in their own workspaces" ON research_insights;
DROP POLICY IF EXISTS "Users can view insights in their accessible workspaces" ON research_insights;
CREATE POLICY "Users can view insights in their accessible workspaces" ON research_insights FOR SELECT
    USING (public.can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "Users can insert insights in their own workspaces" ON research_insights;
CREATE POLICY "Users can insert insights in their own workspaces" ON research_insights FOR INSERT
    WITH CHECK (public.can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "Users can delete insights in their own workspaces" ON research_insights;
CREATE POLICY "Users can delete insights in their own workspaces" ON research_insights FOR DELETE
    USING (public.workspace_role_in(workspace_id, ARRAY['admin']));

-- workspace_members
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
CREATE POLICY "Users can view members of their workspaces" ON workspace_members FOR SELECT
    USING (user_id = auth.uid() OR public.can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "Admins can manage members" ON workspace_members;
CREATE POLICY "Admins can manage members" ON workspace_members FOR ALL
    USING (public.workspace_role_in(workspace_id, ARRAY['admin']));

-- comments
DROP POLICY IF EXISTS "Users can view comments in their accessible workspaces" ON comments;
CREATE POLICY "Users can view comments in their accessible workspaces" ON comments FOR SELECT
    USING (public.can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "Users can insert comments in their accessible workspaces" ON comments;
CREATE POLICY "Users can insert comments in their accessible workspaces" ON comments FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.can_access_workspace(workspace_id));
DROP POLICY IF EXISTS "Users can delete their own or admin delete" ON comments;
CREATE POLICY "Users can delete their own or admin delete" ON comments FOR DELETE
    USING (user_id = auth.uid() OR public.workspace_role_in(workspace_id, ARRAY['admin']));

-- ---------------------------------------------------------------- Realtime (comments)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

-- ---------------------------------------------------------------- Storage: avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
CREATE POLICY "Avatar images are publicly readable" ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL AND name LIKE 'avatars/' || auth.uid()::text || '.%');
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND name LIKE 'avatars/' || auth.uid()::text || '.%');
