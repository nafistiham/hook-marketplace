#!/usr/bin/env python3
"""
print-statement-guard: Warn when Python files contain bare print() debug calls.

Scans .py files for print( calls at the start of a line or after indentation,
excluding commented lines. Reports up to 5 findings to stderr without blocking.
Skips test files and logging-related modules.
"""

import json
import re
import sys
from pathlib import Path

PRINT_PATTERN = re.compile(r'^(\s*)print\(', re.MULTILINE)
MAX_FINDINGS = 5

SKIP_NAMES = {'logger.py', 'logging.py', 'log.py'}


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    if name in SKIP_NAMES:
        return True
    if 'test' in name or 'spec' in name or '__tests__' in str(p):
        return True
    return False


def find_print_calls(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        stripped = line.lstrip()
        # Skip commented lines
        if stripped.startswith('#'):
            continue
        if PRINT_PATTERN.match(line):
            findings.append((i, line.rstrip()))
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

    p = Path(file_path) if file_path else None
    if p is None or p.suffix.lower() != '.py':
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    findings = find_print_calls(content)
    if not findings:
        sys.exit(0)

    shown = findings[:MAX_FINDINGS]
    detail_lines = [f'  • line {lineno}: {snippet.strip()}' for lineno, snippet in shown]
    extra = f'\n  … and {len(findings) - MAX_FINDINGS} more' if len(findings) > MAX_FINDINGS else ''
    location = f' in {file_path}' if file_path else ''

    warning = (
        f'[print-statement-guard] Warning: {len(findings)} bare print() call(s) found{location}:\n'
        + '\n'.join(detail_lines)
        + extra
        + '\n\nConsider using a proper logger (logging.getLogger(__name__)) instead.'
    )
    print(warning, file=sys.stderr)


if __name__ == '__main__':
    main()
