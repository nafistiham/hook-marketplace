#!/usr/bin/env python3
"""
session-summary — Stop hook for Claude Code
Appends a session summary to ~/.hookpm/logs/sessions-YYYY-MM.log when a session ends.

The log entry includes:
  - ISO timestamp
  - Session ID (from event)
  - Transcript path (if available)
  - stop_reason (if available)
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def get_log_path() -> Path:
    home = Path(os.environ.get("HOME", "~")).expanduser()
    log_dir = home / ".hookpm" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    return log_dir / f"sessions-{month}.log"


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"session-summary: invalid JSON input: {exc}\n")
        sys.exit(0)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    session_id = event.get("session_id", "unknown")
    stop_reason = event.get("stop_reason", "")
    transcript_path = event.get("transcript_path", "")

    parts = [f"[{now}]", f"session={session_id}"]
    if stop_reason:
        parts.append(f"reason={stop_reason}")
    if transcript_path:
        parts.append(f"transcript={transcript_path}")

    line = "  ".join(parts) + "\n"

    log_path = get_log_path()
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError as exc:
        sys.stderr.write(f"session-summary: could not write log: {exc}\n")

    sys.exit(0)


if __name__ == "__main__":
    main()
