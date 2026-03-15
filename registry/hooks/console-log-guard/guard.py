#!/usr/bin/env python3
"""
console-log-guard: Warn on console.log/debug/warn/error in JS/TS files.

Emits warnings to stderr but never blocks. Skips test files.
"""

import json
import re
import sys
from pathlib import Path

JS_EXTENSIONS = {'.js', '.ts', '.jsx', '.tsx'}
TEST_PATTERNS = ['.test.', '.spec.', '_test.', '_spec.']
CONSOLE_PATTERN = re.compile(
    r'\bconsole\.(log|debug|warn|error)\s*\('
)


def is_test_file(file_path: str) -> bool:
    name = Path(file_path).name.lower()
    return any(pat in name for pat in TEST_PATTERNS)


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
    if p is None or p.suffix.lower() not in JS_EXTENSIONS:
        sys.exit(0)

    if is_test_file(file_path):
        sys.exit(0)

    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        m = CONSOLE_PATTERN.search(line)
        if m:
            findings.append((i, f'console.{m.group(1)}('))

    if not findings:
        sys.exit(0)

    sys.stderr.write(f'\n⚠ console-log-guard: {len(findings)} console call(s) in {file_path}:\n')
    for lineno, call in findings[:8]:
        sys.stderr.write(f'  line {lineno}: {call}\n')
    if len(findings) > 8:
        sys.stderr.write(f'  … and {len(findings) - 8} more\n')
    sys.stderr.write('  Remove or replace with a proper logger before merging.\n')


if __name__ == '__main__':
    main()
