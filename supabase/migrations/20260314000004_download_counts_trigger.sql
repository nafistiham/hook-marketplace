-- Migration 0004: Trigger to keep download_counts in sync with downloads table

CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO download_counts (hook_name, total, last_updated)
  VALUES (NEW.hook_name, 1, now())
  ON CONFLICT (hook_name)
  DO UPDATE SET
    total        = download_counts.total + 1,
    last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_increment_download_count
AFTER INSERT ON downloads
FOR EACH ROW EXECUTE FUNCTION increment_download_count();
