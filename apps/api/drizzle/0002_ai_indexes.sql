-- Sprint 3: AI performance indexes
-- ai_conversations and ai_messages tables already exist from 0000_initial

CREATE INDEX IF NOT EXISTS ai_conversations_project_idx ON ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS ai_messages_conv_idx ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS ai_messages_created_idx ON ai_messages(created_at);
CREATE INDEX IF NOT EXISTS project_files_project_path_idx ON project_files(project_id, path);
