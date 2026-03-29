-- Fixes 500 Internal Server error caused by infinite recursion between 
-- the workspaces and workspace_members RLS policies.

CREATE OR REPLACE FUNCTION user_has_workspace_access(check_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is the direct owner
    IF EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = check_workspace_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user is an explicit member
    IF EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = check_workspace_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Replace recursive workspace_members policy
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
CREATE POLICY "Users can view members of their workspaces" 
ON workspace_members FOR SELECT 
USING (
    user_has_workspace_access(workspace_id)
);

-- Replace recursive Admins policy
DROP POLICY IF EXISTS "Admins can manage members" ON workspace_members;
CREATE POLICY "Admins can manage members" 
ON workspace_members FOR ALL 
USING (
    user_has_workspace_access(workspace_id)
);
