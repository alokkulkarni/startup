-- Migration: Add email_verified column for native auth
-- OAuth users (github/google) are auto-verified at sign-up.
-- Email/password users start unverified and must confirm via OTP.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
