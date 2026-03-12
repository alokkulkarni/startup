-- Add role constraint to workspace_members (owner/editor/viewer)
ALTER TABLE workspace_members ALTER COLUMN role SET DEFAULT 'viewer';

-- workspace_invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_invitations_workspace_idx ON workspace_invitations(workspace_id);
CREATE INDEX workspace_invitations_token_idx ON workspace_invitations(token);
CREATE INDEX workspace_invitations_email_idx ON workspace_invitations(email);

-- presence_sessions (for tracking online users per workspace)
CREATE TABLE IF NOT EXISTS presence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'online'
);

CREATE UNIQUE INDEX presence_sessions_unique_idx ON presence_sessions(workspace_id, user_id);
