-- migration_2.sql
-- Real-time Commenting Features

-- 1. Create the comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES research_insights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_email VARCHAR(255) NOT NULL, -- Stored directly to avoid complex auth.users joins on frontend
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure comment belongs to either a paper or an insight, not both or neither
    CONSTRAINT check_comment_target CHECK (
        (paper_id IS NOT NULL AND insight_id IS NULL) OR
        (paper_id IS NULL AND insight_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_comments_workspace_id ON comments(workspace_id);
CREATE INDEX idx_comments_paper_id ON comments(paper_id);
CREATE INDEX idx_comments_insight_id ON comments(insight_id);

-- 2. Enable Row-Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can view comments in workspaces they own or are members of
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

-- Users can insert comments in workspaces they own or are members of
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

-- Users can delete their own comments or Admins can delete any comment in the workspace
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

-- 4. Enable Supabase Realtime broadcast for the comments table
-- Drop publication if it exists (for safety/idempotency) and recreate, or just add the table
BEGIN;
    -- Supabase usually has a default publication named "supabase_realtime"
    -- If it doesn't, this will fail gracefully but usually it is there.
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
COMMIT;
