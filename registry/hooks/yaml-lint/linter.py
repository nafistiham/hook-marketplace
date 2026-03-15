#!/usr/bin/env python3
"""
yaml-lint: Validate YAML syntax before writing .yml/.yaml files.

Uses Python's yaml module (PyYAML) to parse content and blocks if a
syntax error is detected, reporting the exact error message and line.
"""

import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore[import]
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False

YAML_EXTENSIONS = {'.yml', '.yaml'}


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    if not _YAML_AVAILABLE:
        # PyYAML not installed — skip silently
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    content = tool_input.get('content', '') or tool_input.get('new_string', '')
    file_path = tool_input.get('file_path', '')

    if not content:
        sys.exit(0)

    p = Path(file_path) if file_path else Path('unknown.yaml')
    if p.suffix.lower() not in YAML_EXTENSIONS:
        sys.exit(0)

    try:
        # Consume all documents — safe_load_all is a generator
        list(yaml.safe_load_all(content))
    except yaml.YAMLError as exc:
        line_info = ''
        if hasattr(exc, 'problem_mark') and exc.problem_mark is not None:
            mark = exc.problem_mark
            line_info = f' at line {mark.line + 1}, column {mark.column + 1}'

        problem = getattr(exc, 'problem', str(exc))
        context = getattr(exc, 'context', None)
        detail = problem
        if context:
            detail = f'{context}: {problem}'

        location = f' in {file_path}' if file_path else ''
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'YAML syntax error{location}{line_info}:\n'
                f'  {detail}\n\n'
                'Fix the YAML syntax error before saving.'
            ),
        }))


if __name__ == '__main__':
    main()
