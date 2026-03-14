#!/usr/bin/env python3
"""
file-size-guard: Warn when a written file exceeds the line limit.

Runs after Write/Edit. Reads file_path from tool_input, counts lines,
and prints a warning if the file exceeds MAX_LINES.
"""

import json
import os
import sys

MAX_LINES = int(os.environ.get('FILE_SIZE_GUARD_MAX_LINES', '800'))


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    file_path = tool_input.get('file_path', '')

    if not file_path:
        sys.exit(0)

    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            line_count = sum(1 for _ in f)
    except OSError:
        sys.exit(0)  # File may not exist or not be readable — skip

    if line_count <= MAX_LINES:
        sys.exit(0)

    sys.stderr.write(
        f'\n⚠️  file-size-guard: {file_path} is {line_count} lines '
        f'(limit: {MAX_LINES}). Consider splitting into smaller modules.\n'
    )
    sys.exit(0)  # Warning only — do not block


if __name__ == '__main__':
    main()
