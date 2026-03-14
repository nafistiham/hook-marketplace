-- Migration 0003: Author download totals view for rankings

-- View: total downloads per author, derived from download_counts + hook_versions
-- Used by GET /authors/rankings
CREATE OR REPLACE VIEW author_download_totals AS
SELECT
  a.username,
  a.id          AS author_id,
  COALESCE(SUM(dc.total), 0) AS total_downloads,
  COUNT(DISTINCT hv.name)    AS hook_count
FROM authors a
LEFT JOIN hook_versions hv ON hv.author_id = a.id
LEFT JOIN download_counts dc ON dc.hook_name = hv.name
GROUP BY a.id, a.username;
