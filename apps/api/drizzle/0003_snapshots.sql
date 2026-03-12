CREATE TABLE IF NOT EXISTS project_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  files_json  JSONB NOT NULL DEFAULT '[]',
  triggered_by TEXT NOT NULL DEFAULT 'ai',
  description TEXT,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX project_snapshots_project_idx ON project_snapshots(project_id, created_at DESC);
