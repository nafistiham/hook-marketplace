#!/usr/bin/env python3
"""
cors-wildcard-guard: Warn about CORS wildcard patterns in source files.

Scans TS, JS, Python, Go, Java, and Ruby files for CORS wildcard origins.
Emits a warning to stderr with line numbers but does not block — wildcard
CORS may be intentional for fully public APIs. Skips test files.
"""

import json
import re
import sys
from pathlib import Path

APPLICABLE_EXTENSIONS = {'.ts', '.js', '.jsx', '.tsx', '.py', '.go', '.java', '.rb'}

CORS_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'Access-Control-Allow-Origin\s*[:=]\s*["\']?\*["\']?'), 'Access-Control-Allow-Origin: *'),
    (re.compile(r'\borigin\s*[:=]\s*["\']?\*["\']?'), "origin: '*'"),
    (re.compile(r'\borigin\s*[:=]\s*\[[\s"\']*\*[\s"\']*\]'), 'origin: ["*"]'),
    (re.compile(r'\ballow_origins\s*=\s*\[[\s"\']*\*[\s"\']*\]'), 'allow_origins=["*"]'),
    (re.compile(r'\bcors_origin\s*=\s*["\']?\*["\']?'), 'cors_origin = "*"'),
]


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def find_cors_wildcards(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        for pattern, label in CORS_PATTERNS:
            if pattern.search(line):
                findings.append((i, label))
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

    p = Path(file_path) if file_path else None
    if p is None:
        sys.exit(0)

    if p.suffix.lower() not in APPLICABLE_EXTENSIONS:
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    findings = find_cors_wildcards(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in findings]

    print(
        f'[cors-wildcard-guard] CORS wildcard origin detected{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nWildcard CORS allows any origin to access this resource. '
        'Verify this is intentional for a fully public API. '
        'For authenticated endpoints, restrict to explicit allowed origins.',
        file=sys.stderr,
    )

    sys.exit(0)


if __name__ == '__main__':
    main()
