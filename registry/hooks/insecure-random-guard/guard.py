#!/usr/bin/env python3
"""
insecure-random-guard: Warn when insecure RNG is used in security-sensitive contexts.

Checks Python and JS/TS files for Math.random(), random.random(), random.randint(),
and random.choice() calls. Only warns when the surrounding line or adjacent
assignment target contains security-sensitive variable name keywords:
token, key, secret, password, nonce, salt, session. Skips test files.
"""

import json
import re
import sys
from pathlib import Path

PY_EXTENSION = '.py'
JS_EXTENSIONS = {'.js', '.ts', '.jsx', '.tsx'}
APPLICABLE_EXTENSIONS = JS_EXTENSIONS | {PY_EXTENSION}

SECURITY_KEYWORDS = re.compile(
    r'\b(token|key|secret|password|passwd|nonce|salt|session)\b',
    re.IGNORECASE,
)

INSECURE_RNG_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\brandom\.random\s*\('), 'random.random()'),
    (re.compile(r'\brandom\.randint\s*\('), 'random.randint()'),
    (re.compile(r'\brandom\.choice\s*\('), 'random.choice()'),
    (re.compile(r'\brandom\.uniform\s*\('), 'random.uniform()'),
    (re.compile(r'\bMath\.random\s*\('), 'Math.random()'),
]


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def is_security_sensitive(line: str) -> bool:
    return bool(SECURITY_KEYWORDS.search(line))


def find_insecure_rng(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    lines = content.splitlines()
    for i, line in enumerate(lines, 1):
        for pattern, label in INSECURE_RNG_PATTERNS:
            if not pattern.search(line):
                continue
            # Check the line itself and a small window of context for security keywords.
            context_start = max(0, i - 3)
            context_end = min(len(lines), i + 2)
            context = ' '.join(lines[context_start:context_end])
            if is_security_sensitive(context):
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

    findings = find_insecure_rng(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in findings]

    print(
        f'[insecure-random-guard] Insecure RNG in security-sensitive context{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nMath.random() and the Python random module are not cryptographically secure. '
        'Use secrets.token_hex() / secrets.token_bytes() in Python, '
        'or crypto.getRandomValues() / crypto.randomUUID() in Node.js.',
        file=sys.stderr,
    )

    sys.exit(0)


if __name__ == '__main__':
    main()
