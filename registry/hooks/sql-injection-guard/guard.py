#!/usr/bin/env python3
"""
sql-injection-guard: Detect SQL injection patterns in code being written.

Checks for:
- String concatenation into SQL (SELECT * FROM ' + var)
- f-string SQL (f"SELECT * FROM {table}")
- .format() in SQL strings
- % formatting in SQL strings
"""

import json
import re
import sys
from pathlib import Path

SQL_KEYWORDS = r'(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE)'

# f-string SQL: f"SELECT ... {variable}"
FSTRING_SQL_RE = re.compile(
    rf'f["\'].*{SQL_KEYWORDS}.*\{{[^}}]+\}}',
    re.IGNORECASE | re.DOTALL,
)

# String concatenation SQL: "SELECT " + var or "SELECT " + req.
CONCAT_SQL_RE = re.compile(
    rf'["\'].*{SQL_KEYWORDS}[^"\']*["\'] *\+',
    re.IGNORECASE,
)

# .format() SQL: "SELECT {} FROM".format(
FORMAT_SQL_RE = re.compile(
    rf'["\'].*{SQL_KEYWORDS}.*\{{[^}}]*\}}.*["\']\.format\(',
    re.IGNORECASE,
)

# % formatting SQL: "SELECT %s FROM %s" % (
PERCENT_SQL_RE = re.compile(
    rf'["\'].*{SQL_KEYWORDS}.*%[sd][^"\']*["\'] *%',
    re.IGNORECASE,
)

PATTERNS = [
    (FSTRING_SQL_RE, 'f-string interpolation in SQL query'),
    (CONCAT_SQL_RE, 'string concatenation into SQL query'),
    (FORMAT_SQL_RE, '.format() call on SQL string'),
    (PERCENT_SQL_RE, '% formatting on SQL string'),
]

# File extensions where SQL injection is relevant
SQL_RELEVANT_EXTENSIONS = {
    '.py', '.js', '.ts', '.tsx', '.jsx', '.rb', '.php',
    '.java', '.cs', '.go', '.rs', '.swift',
}


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    content = tool_input.get('content', '')
    file_path = tool_input.get('file_path', '')

    # For Edit tool, content may be in new_string
    if not content:
        content = tool_input.get('new_string', '')

    if not content:
        sys.exit(0)

    # Only check relevant file types
    if file_path and Path(file_path).suffix not in SQL_RELEVANT_EXTENSIONS:
        sys.exit(0)

    findings = []
    for pattern, description in PATTERNS:
        matches = pattern.findall(content)
        if matches:
            findings.append(f'  • {description}: {matches[0][:120].strip()!r}')

    if not findings:
        sys.exit(0)

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Potential SQL injection detected in {file_path or "content"}:\n'
            + '\n'.join(findings)
            + '\n\nUse parameterized queries instead:\n'
            '  Python:  cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))\n'
            '  Node.js: db.query("SELECT * FROM users WHERE id = ?", [userId])\n'
            '  SQLAlchemy: session.execute(text("SELECT * FROM u WHERE id = :id"), {"id": uid})'
        ),
    }))


if __name__ == '__main__':
    main()
