#!/usr/bin/env python3
"""
critical-path-guard — PreToolUse hook for Claude Code
Blocks writes to critical file paths unless explicitly permitted.

Default critical patterns (case-insensitive, matched against full file path):
  - auth, oauth, jwt, session, token, credential
  - payment, billing, stripe, checkout, invoice
  - middleware (when not a test file)
  - migration, schema (database files)
  - .env files

Configuration via environment variables:
  CRITICAL_PATH_ALLOW=1        — set to bypass the guard for this session
  CRITICAL_PATH_PATTERNS=pat1,pat2  — comma-separated regex patterns to ADD to defaults

Exit codes:
  0 — path is safe to write
  2 — blocked (critical path detected; message on stderr)
"""
import json
import os
import re
import sys

DEFAULT_PATTERNS = [
    r"(^|/)auth[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)oauth[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)jwt[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)(session|sessions)[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)token[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)credentials?[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)payment[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)billing[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)stripe[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)checkout[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)invoice[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"(^|/)middleware[^/]*\.(ts|js|py|rb|go|java|cs|php)$",
    r"/migrations?/[^/]+\.sql$",
    r"/migrations?/[^/]+\.(ts|js|py)$",
    r"(^|/)schema\.(prisma|sql)$",
    r"(^|/)\.env(\.|$)",
]

# Test files are excluded — modifying auth tests is fine
TEST_EXCLUSION = re.compile(r"(test|spec|__tests__|__mocks__)", re.IGNORECASE)


def is_critical(file_path: str, patterns: list[str]) -> str | None:
    """Return the matching pattern description if path is critical, else None."""
    if TEST_EXCLUSION.search(file_path):
        return None  # Test files are always safe
    for pattern in patterns:
        if re.search(pattern, file_path, re.IGNORECASE):
            return pattern
    return None


def main() -> None:
    # Allow bypass via env var
    if os.environ.get("CRITICAL_PATH_ALLOW", "").strip() in ("1", "true", "yes"):
        sys.exit(0)

    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"critical-path-guard: invalid JSON input: {exc}\n")
        sys.exit(0)  # Fail open

    tool_input = event.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not file_path:
        sys.exit(0)

    # Build patterns: defaults + any user-supplied extras
    patterns = list(DEFAULT_PATTERNS)
    extra = os.environ.get("CRITICAL_PATH_PATTERNS", "").strip()
    if extra:
        patterns.extend(p.strip() for p in extra.split(",") if p.strip())

    matched = is_critical(file_path, patterns)
    if not matched:
        sys.exit(0)

    sys.stderr.write(
        f"critical-path-guard: blocked — write to critical path\n"
        f"  File:    {file_path}\n"
        f"  Matched: {matched}\n"
        f"\n"
        f"  This file is in a protected category (auth, payments, migrations, etc.).\n"
        f"  If this change is intentional, bypass the guard for this session:\n"
        f"\n"
        f"    export CRITICAL_PATH_ALLOW=1\n"
        f"\n"
        f"  Or add custom patterns via CRITICAL_PATH_PATTERNS=<regex1,regex2>.\n"
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
