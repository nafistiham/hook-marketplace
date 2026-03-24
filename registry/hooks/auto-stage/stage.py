#!/usr/bin/env python3
"""
auto-stage — PostToolUse hook for Claude Code
Runs 'git add <file>' on every file Claude writes or edits.

Keeps the staging index in sync so 'git diff --staged' always reflects
Claude's current work without requiring manual git add.

Exit codes:
  0 — always (this hook never blocks; errors are printed to stderr and ignored)
"""
import json
import os
import subprocess
import sys


def get_file_path(event: dict) -> str | None:
    """Extract the file path from a Write or Edit tool event."""
    tool_input = event.get("tool_input", {})
    # Write uses 'file_path', Edit uses 'file_path' too
    return tool_input.get("file_path")


def is_git_repo(path: str) -> bool:
    """Check if path is inside a git repository."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=os.path.dirname(path) if os.path.isfile(path) else path,
            capture_output=True,
            text=True,
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"auto-stage: invalid JSON input: {exc}\n")
        sys.exit(0)

    file_path = get_file_path(event)
    if not file_path:
        sys.exit(0)

    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        sys.exit(0)  # File doesn't exist yet (shouldn't happen post-Write, but be safe)

    if not is_git_repo(abs_path):
        sys.exit(0)  # Not in a git repo — nothing to do

    try:
        result = subprocess.run(
            ["git", "add", abs_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            sys.stderr.write(f"auto-stage: git add failed: {result.stderr.strip()}\n")
    except FileNotFoundError:
        sys.stderr.write("auto-stage: git not found in PATH\n")

    sys.exit(0)  # Always exit 0 — never block


if __name__ == "__main__":
    main()
