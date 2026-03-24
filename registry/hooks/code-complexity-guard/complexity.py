#!/usr/bin/env python3
"""
code-complexity-guard — PostToolUse hook for Claude Code
Warns when a single edit touches more than MAX_LINES lines.

Large, sweeping edits are a common signal of AI hallucination or unintended
scope creep. This hook surfaces a warning so the developer can review before
continuing.

Configuration via environment variable:
  COMPLEXITY_GUARD_MAX_LINES — integer, default 200

Exit codes:
  0 — edit is within the line limit (or we can't determine — fail open)
  1 — warn (exit 1 produces a warning in Claude Code, does not block)
"""
import json
import os
import sys


DEFAULT_MAX_LINES = 200


def count_lines_written(event: dict) -> int | None:
    """
    Count lines changed in this edit event.
    For Write: count lines in the new file content.
    For Edit: count lines in old_string + new_string (proxy for change size).
    Returns None if we cannot determine.
    """
    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input", {})

    if tool_name == "Write":
        content = tool_input.get("content", "")
        return len(content.splitlines())

    if tool_name == "Edit":
        old = tool_input.get("old_string", "")
        new = tool_input.get("new_string", "")
        return len(old.splitlines()) + len(new.splitlines())

    return None


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"code-complexity-guard: invalid JSON input: {exc}\n")
        sys.exit(0)

    max_lines_raw = os.environ.get("COMPLEXITY_GUARD_MAX_LINES", str(DEFAULT_MAX_LINES))
    try:
        max_lines = int(max_lines_raw)
    except ValueError:
        sys.stderr.write(
            f"code-complexity-guard: COMPLEXITY_GUARD_MAX_LINES must be an integer, "
            f"got {max_lines_raw!r} — using default {DEFAULT_MAX_LINES}\n"
        )
        max_lines = DEFAULT_MAX_LINES

    line_count = count_lines_written(event)
    if line_count is None or line_count <= max_lines:
        sys.exit(0)

    file_path = event.get("tool_input", {}).get("file_path", "<unknown file>")
    sys.stderr.write(
        f"code-complexity-guard: ⚠ large edit detected\n"
        f"  File:        {file_path}\n"
        f"  Lines touched: {line_count} (limit: {max_lines})\n"
        f"\n"
        f"  This may indicate unintended scope creep or an overly broad rewrite.\n"
        f"  Review the diff carefully before continuing.\n"
        f"\n"
        f"  To adjust the threshold: export COMPLEXITY_GUARD_MAX_LINES=<n>\n"
    )
    sys.exit(1)  # Warn, not block


if __name__ == "__main__":
    main()
