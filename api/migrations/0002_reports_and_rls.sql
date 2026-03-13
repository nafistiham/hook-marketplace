-- Migration 0002: Reports table + RLS on all tables

-- Reports: users flag hooks as broken, malicious, or misleading
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_name    TEXT NOT NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('malware', 'broken', 'misleading', 'spam', 'other')),
  details      TEXT,
  reporter_ip  TEXT,  -- hashed, for deduplication only
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_hook_name ON reports (hook_name);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at);

-- Enable RLS on all tables (service_role key bypasses — anon key blocked)
ALTER TABLE authors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports         ENABLE ROW LEVEL SECURITY;

-- No policies added — service_role bypasses RLS, anon key gets nothing
