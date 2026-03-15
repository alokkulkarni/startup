CREATE TABLE IF NOT EXISTS deployments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'vercel',
  status        TEXT NOT NULL DEFAULT 'pending',
  provider_id   TEXT,
  deploy_url    TEXT,
  error_message TEXT,
  snapshot_id   UUID REFERENCES project_snapshots(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX deployments_project_idx ON deployments(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_env_vars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value_enc   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, key)
);

CREATE INDEX env_vars_project_idx ON project_env_vars(project_id);
