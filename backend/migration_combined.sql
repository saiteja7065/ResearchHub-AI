-- MAKE workspace_members AND comments IDEMPOTENT

-- For workspace_members
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
CREATE POLICY "Users can view members of their workspaces" 
ON workspace_members FOR SELECT 
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM workspace_members AS wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage members" ON workspace_members;
CREATE POLICY "Admins can manage members" 
ON workspace_members FOR ALL 
USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM workspace_members AS wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin')
);

-- Update workspaces RLS
DROP POLICY IF EXISTS "Users can only view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own and shared workspaces" ON workspaces;
CREATE POLICY "Users can view their own and shared workspaces" 
ON workspaces FOR SELECT 
USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid())
);

-- Update papers RLS
DROP POLICY IF EXISTS "Users can only view their own papers" ON papers;
DROP POLICY IF EXISTS "Users can view papers in their accessible workspaces" ON papers;
CREATE POLICY "Users can view papers in their accessible workspaces" 
ON papers FOR SELECT 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM workspaces 
        LEFT JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
        WHERE workspaces.id = papers.workspace_id 
        AND (workspaces.user_id = auth.uid() OR workspace_members.user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can insert their own papers" ON papers;
DROP POLICY IF EXISTS "Editors and Admins can insert papers" ON papers;
CREATE POLICY "Editors and Admins can insert papers" 
ON papers FOR INSERT 
WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM workspaces 
        LEFT JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
        WHERE workspaces.id = papers.workspace_id 
        AND (workspaces.user_id = auth.uid() OR (workspace_members.user_id = auth.uid() AND workspace_members.role IN ('admin', 'editor')))
    )
);

-- Update research_insights RLS
DROP POLICY IF EXISTS "Users can only view insights in their own workspaces" ON research_insights;
DROP POLICY IF EXISTS "Users can view insights in their accessible workspaces" ON research_insights;
CREATE POLICY "Users can view insights in their accessible workspaces" 
ON research_insights FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM workspaces 
        LEFT JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
        WHERE workspaces.id = research_insights.workspace_id 
        AND (workspaces.user_id = auth.uid() OR workspace_members.user_id = auth.uid())
    )
);

-- For comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES research_insights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT check_comment_target_new CHECK (
        (paper_id IS NOT NULL AND insight_id IS NULL) OR
        (paper_id IS NULL AND insight_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_comments_workspace_id ON comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_paper_id ON comments(paper_id);
CREATE INDEX IF NOT EXISTS idx_comments_insight_id ON comments(insight_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments in their accessible workspaces" ON comments;
CREATE POLICY "Users can view comments in their accessible workspaces" 
ON comments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM workspaces 
        LEFT JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
        WHERE workspaces.id = comments.workspace_id 
        AND (workspaces.user_id = auth.uid() OR workspace_members.user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can insert comments in their accessible workspaces" ON comments;
CREATE POLICY "Users can insert comments in their accessible workspaces" 
ON comments FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM workspaces 
        LEFT JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
        WHERE workspaces.id = comments.workspace_id 
        AND (workspaces.user_id = auth.uid() OR workspace_members.user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete their own or admin delete" ON comments;
CREATE POLICY "Users can delete their own or admin delete" 
ON comments FOR DELETE 
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM workspaces 
        LEFT JOIN workspace_members ON workspaces.id = workspace_members.workspace_id
        WHERE workspaces.id = comments.workspace_id 
        AND (workspaces.user_id = auth.uid() OR (workspace_members.user_id = auth.uid() AND workspace_members.role = 'admin'))
    )
);

BEGIN;
    -- Try to add, it might fail if already added, but that's fine
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
COMMIT;
