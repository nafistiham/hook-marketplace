#!/usr/bin/env python3
"""
conflict-marker-guard: Block writes containing git conflict markers.

Scans content for unresolved merge conflict markers and reports the
exact line numbers before they are persisted to disk.
"""

import json
import sys

CONFLICT_MARKERS = ['<<<<<<<', '=======', '>>>>>>>']


def find_conflict_markers(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        for marker in CONFLICT_MARKERS:
            if line.startswith(marker):
                findings.append((i, marker))
                break
    return findings


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    content = tool_input.get('content', '') or tool_input.get('new_string', '')
    file_path = tool_input.get('file_path', '')

    if not content:
        sys.exit(0)

    findings = find_conflict_markers(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {marker}' for lineno, marker in findings]

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Found {len(findings)} git conflict marker(s){location}:\n'
            + '\n'.join(detail_lines)
            + '\n\nResolve all merge conflicts before saving.'
        ),
    }))


if __name__ == '__main__':
    main()
