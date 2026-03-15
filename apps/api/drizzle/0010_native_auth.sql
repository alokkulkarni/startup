-- Migration: Replace Keycloak with native authentication
-- Makes keycloak_id nullable and adds auth provider columns

ALTER TABLE users ALTER COLUMN keycloak_id DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
