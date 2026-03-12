-- Create keycloak database
CREATE DATABASE keycloak;

-- Enable extensions on main forge DB
\c forge;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
