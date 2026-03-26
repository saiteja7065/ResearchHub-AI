-- Create the junction table for Multi-Workspace Collaboration
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

-- Enable RLS on the new table
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace Members Policies
-- A user can see members of a workspace if they are a member themselves OR if they own the workspace
CREATE POLICY "Users can view members of their workspaces" 
ON workspace_members FOR SELECT 
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM workspace_members AS wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid())
);

-- Only workspace owners or admins can invite/remove/update members
CREATE POLICY "Admins can manage members" 
ON workspace_members FOR ALL 
USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM workspace_members AS wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin')
);

---------------------------------------------------------------------------------
-- UPDATE EXISTING RLS POLICIES TO SUPPORT COLLABORATION
---------------------------------------------------------------------------------

-- 1. Workspaces
DROP POLICY IF EXISTS "Users can only view their own workspaces" ON workspaces;
CREATE POLICY "Users can view their own and shared workspaces" 
ON workspaces FOR SELECT 
USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid())
);

-- 2. Papers
DROP POLICY IF EXISTS "Users can only view their own papers" ON papers;
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


-- 3. Research Insights
DROP POLICY IF EXISTS "Users can only view insights in their own workspaces" ON research_insights;
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

-- 4. Chat History
-- (Assuming chat_history table looks similar, if it exists)
-- If it exists, we will update it too. Wait, chat_history was added in a previous feature but wasn't in schema.sql...
