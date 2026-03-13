-- Migration 0001: Initial schema for hookpm Phase 1B
-- Run against Supabase project: pnpm supabase db push

-- Authors: one row per GitHub user who has published at least one hook
CREATE TABLE IF NOT EXISTS authors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT UNIQUE NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hook versions: immutable, one row per (name, version) pair
CREATE TABLE IF NOT EXISTS hook_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  version       TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hook_versions_name_version_unique UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_hook_versions_name ON hook_versions (name);
CREATE INDEX IF NOT EXISTS idx_hook_versions_author ON hook_versions (author_id);

-- Downloads: append-only analytics, one row per archive download
CREATE TABLE IF NOT EXISTS downloads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_name       TEXT NOT NULL,
  version         TEXT NOT NULL,
  downloaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  hookpm_version  TEXT,
  -- No FK to hook_versions — keep analytics even if hook is removed
  cf_ray          TEXT  -- Cloudflare-Ray header for deduplication
);

CREATE INDEX IF NOT EXISTS idx_downloads_hook_name ON downloads (hook_name);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON downloads (downloaded_at);

-- Materialized download counts per hook (refreshed periodically)
CREATE TABLE IF NOT EXISTS download_counts (
  hook_name     TEXT PRIMARY KEY,
  total         BIGINT NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);
