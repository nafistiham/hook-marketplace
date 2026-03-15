#!/usr/bin/env python3
"""
sql-query-builder-guard: Block raw SQL string concatenation patterns.

Detects SQL queries built via string concatenation (+), f-strings, or
.format() calls. This is more aggressive than sql-injection-guard: it flags
the anti-pattern of building SQL strings at all, not just obvious injections.
Skips test files and ORM schema files (models.py, schema.py).
"""

import json
import re
import sys
from pathlib import Path

APPLICABLE_EXTENSIONS = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rb', '.php'}

SQL_KEYWORDS = re.compile(r'\b(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|JOIN)\b', re.IGNORECASE)

# Patterns that indicate string-building of SQL queries.
BUILD_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'["\']SELECT\b.*?["\'\s]\s*\+'), 'SQL SELECT built via string concatenation'),
    (re.compile(r'["\']INSERT\b.*?["\'\s]\s*\+'), 'SQL INSERT built via string concatenation'),
    (re.compile(r'["\']UPDATE\b.*?["\'\s]\s*\+'), 'SQL UPDATE built via string concatenation'),
    (re.compile(r'["\']DELETE\b.*?["\'\s]\s*\+'), 'SQL DELETE built via string concatenation'),
    (re.compile(r'["\']WHERE\s.*?["\'\s]\s*\+'), 'SQL WHERE clause built via string concatenation'),
    (re.compile(r'\bf["\']SELECT\b'), 'SQL SELECT in f-string'),
    (re.compile(r'\bf["\']INSERT\b'), 'SQL INSERT in f-string'),
    (re.compile(r'\bf["\']UPDATE\b'), 'SQL UPDATE in f-string'),
    (re.compile(r'\bf["\']DELETE\b'), 'SQL DELETE in f-string'),
    (re.compile(r'\bf["\'].*WHERE\s'), 'SQL WHERE in f-string'),
]

FORMAT_WITH_SQL = re.compile(r'\.format\s*\(')

ORM_FILES = {'models.py', 'schema.py', 'schemas.py', 'model.py'}


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    if name in ORM_FILES:
        return True
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def is_comment_line(line: str) -> bool:
    stripped = line.lstrip()
    return stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('*')


def find_sql_building(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    lines = content.splitlines()
    for i, line in enumerate(lines, 1):
        if is_comment_line(line):
            continue
        # Check direct build patterns first.
        matched = False
        for pattern, label in BUILD_PATTERNS:
            if pattern.search(line):
                findings.append((i, label))
                matched = True
                break
        if matched:
            continue
        # Check .format() on a line that also contains SQL keywords.
        if FORMAT_WITH_SQL.search(line) and SQL_KEYWORDS.search(line):
            findings.append((i, 'SQL query built via .format() — use parameterized queries'))
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

    findings = find_sql_building(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in findings]

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Found {len(findings)} raw SQL string-building pattern(s){location}:\n'
            + '\n'.join(detail_lines)
            + '\n\nBuilding SQL strings via concatenation or f-strings creates SQL injection risk '
            'even when inputs appear controlled. '
            'Use parameterized queries (?, %s, $1) or an ORM instead.'
        ),
    }))


if __name__ == '__main__':
    main()
