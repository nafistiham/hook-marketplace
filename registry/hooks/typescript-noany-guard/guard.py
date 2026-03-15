#!/usr/bin/env python3
"""
typescript-noany-guard: Warn on explicit `any` type usage in TypeScript files.

Detects : any, as any, <any>, and Array<any> patterns. Skips commented
lines and test files. Emits warnings to stderr only — never blocks.
"""

import json
import re
import sys
from pathlib import Path

TS_EXTENSIONS = {'.ts', '.tsx'}
TEST_PATTERNS = ['.test.', '.spec.', '_test.', '_spec.']

ANY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r':\s*any\b'), ': any'),
    (re.compile(r'\bas\s+any\b'), 'as any'),
    (re.compile(r'<any>'), '<any>'),
    (re.compile(r'Array\s*<\s*any\s*>'), 'Array<any>'),
]

COMMENT_PREFIX = re.compile(r'^\s*(//)|(^\s*\*)')


def is_test_file(file_path: str) -> bool:
    name = Path(file_path).name.lower()
    return any(pat in name for pat in TEST_PATTERNS)


def is_comment_line(line: str) -> bool:
    return bool(COMMENT_PREFIX.match(line))


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
    if p is None or p.suffix.lower() not in TS_EXTENSIONS:
        sys.exit(0)

    if is_test_file(file_path):
        sys.exit(0)

    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        if is_comment_line(line):
            continue
        for pattern, label in ANY_PATTERNS:
            if pattern.search(line):
                findings.append((i, label))
                break  # one finding per line

    if not findings:
        sys.exit(0)

    sys.stderr.write(f'\n⚠ typescript-noany-guard: {len(findings)} `any` usage(s) in {file_path}:\n')
    for lineno, label in findings[:5]:
        sys.stderr.write(f'  line {lineno}: {label}\n')
    if len(findings) > 5:
        sys.stderr.write(f'  … and {len(findings) - 5} more\n')
    sys.stderr.write('  Replace `any` with a specific type or `unknown` for safer type checking.\n')


if __name__ == '__main__':
    main()
