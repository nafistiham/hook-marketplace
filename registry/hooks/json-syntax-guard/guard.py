#!/usr/bin/env python3
"""
json-syntax-guard: Validate JSON syntax before writing .json files.

Uses Python's built-in json module to parse content and blocks if a
syntax error is detected, reporting the error message with line and
column numbers. Pure stdlib — no external dependencies.
"""

import json
import sys
from pathlib import Path

JSON_EXTENSION = '.json'
SKIP_FILENAMES = {'package-lock.json', 'yarn.lock'}


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

    p = Path(file_path) if file_path else Path('unknown.json')
    if p.suffix.lower() != JSON_EXTENSION:
        sys.exit(0)

    if p.name.lower() in SKIP_FILENAMES:
        sys.exit(0)

    try:
        json.loads(content)
    except json.JSONDecodeError as exc:
        location = f' in {file_path}' if file_path else ''
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'JSON syntax error{location} at line {exc.lineno}, column {exc.colno}:\n'
                f'  {exc.msg}\n\n'
                'Fix the JSON syntax error before saving.'
            ),
        }))


if __name__ == '__main__':
    main()
