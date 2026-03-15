#!/usr/bin/env python3
"""
debug-artifact-guard: Block writes containing debug artifacts.

Detects debugger statements, breakpoints, and debug helpers across
JavaScript/TypeScript, Python, Ruby, and PHP. Skips test files.
"""

import json
import re
import sys
from pathlib import Path

TEST_PATTERNS = ['.test.', '.spec.', '_test.', '_spec.', 'test_', 'spec_']

# Each tuple: (pattern, description)
DEBUG_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # JS/TS: debugger statement on its own line
    (re.compile(r'^\s*debugger\s*;?\s*$'), 'debugger statement'),
    # Python
    (re.compile(r'\bpdb\.set_trace\s*\(\s*\)'), 'pdb.set_trace()'),
    (re.compile(r'^\s*breakpoint\s*\(\s*\)\s*$'), 'breakpoint()'),
    # Ruby
    (re.compile(r'\bbinding\.pry\b'), 'binding.pry'),
    (re.compile(r'\bbyebug\b'), 'byebug'),
    # PHP
    (re.compile(r'\bdd\s*\('), 'dd('),
    (re.compile(r'\bdump\s*\('), 'dump('),
    (re.compile(r'\bvar_dump\s*\('), 'var_dump('),
]

DEBUG_CONSOLE_PATTERN = re.compile(
    r'\bconsole\.log\s*\([^)]*\b(debug|test|TODO|todo|FIXME|fixme)\b',
    re.IGNORECASE,
)


def is_test_file(file_path: str) -> bool:
    name = Path(file_path).name.lower()
    return any(pat in name for pat in TEST_PATTERNS)


def scan(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        for pattern, description in DEBUG_PATTERNS:
            if pattern.search(line):
                findings.append((i, description))
                break
        else:
            if DEBUG_CONSOLE_PATTERN.search(line):
                findings.append((i, 'console.log with debug content'))
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

    if is_test_file(file_path):
        sys.exit(0)

    findings = scan(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {desc}' for lineno, desc in findings[:8]]

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Found {len(findings)} debug artifact(s){location}:\n'
            + '\n'.join(detail_lines)
            + (f'\n  … and {len(findings) - 8} more' if len(findings) > 8 else '')
            + '\n\nRemove debug artifacts before saving.'
        ),
    }))


if __name__ == '__main__':
    main()
