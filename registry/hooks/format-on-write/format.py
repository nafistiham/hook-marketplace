#!/usr/bin/env python3
"""
format-on-write — PostToolUse hook for Claude Code
Formats files after Write/Edit/NotebookEdit tool calls.

Formatters used (if installed):
  .js .jsx .ts .tsx .json .css .md  → prettier
  .py                               → black
  .go                               → gofmt

Exit code is always 0 — formatting errors are warnings, not blockers.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

FORMATTERS: dict[str, list[str]] = {
    ".js":   ["prettier", "--write"],
    ".jsx":  ["prettier", "--write"],
    ".ts":   ["prettier", "--write"],
    ".tsx":  ["prettier", "--write"],
    ".json": ["prettier", "--write"],
    ".css":  ["prettier", "--write"],
    ".html": ["prettier", "--write"],
    ".md":   ["prettier", "--write"],
    ".py":   ["black", "--quiet"],
    ".go":   ["gofmt", "-w"],
}


def format_file(filepath: str) -> None:
    ext = Path(filepath).suffix.lower()
    formatter = FORMATTERS.get(ext)
    if not formatter:
        return  # No formatter for this extension

    cmd = formatter + [filepath]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except FileNotFoundError:
        # Formatter not installed — skip silently
        pass
    except subprocess.CalledProcessError as exc:
        sys.stderr.write(
            f"format-on-write: {cmd[0]} failed on {filepath}: "
            f"{exc.stderr.decode(errors='replace').strip()}\n"
        )


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"format-on-write: invalid JSON input: {exc}\n")
        sys.exit(0)

    tool_input = event.get("tool_input", {})

    # Write tool: { "file_path": "..." }
    # Edit tool:  { "file_path": "..." }
    file_path = tool_input.get("file_path")
    if not file_path:
        sys.exit(0)

    if not os.path.isfile(file_path):
        sys.exit(0)

    format_file(file_path)
    sys.exit(0)


if __name__ == "__main__":
    main()
