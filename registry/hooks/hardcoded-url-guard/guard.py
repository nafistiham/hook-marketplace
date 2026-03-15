#!/usr/bin/env python3
"""
hardcoded-url-guard: Warn when source files contain hardcoded localhost or private-network URLs.

Scans .ts, .js, .py, .go, .java, .rs, .rb files for localhost and private-network
URL patterns and emits a warning to stderr. Skips test files, .env files, and
config files that legitimately set these values.
"""

import json
import re
import sys
from pathlib import Path

SOURCE_EXTENSIONS = {'.ts', '.js', '.py', '.go', '.java', '.rs', '.rb', '.tsx', '.jsx'}

URL_PATTERNS = [
    re.compile(r'http://localhost'),
    re.compile(r'http://127\.0\.0\.1'),
    re.compile(r'http://0\.0\.0\.0'),
    re.compile(r'192\.168\.'),
    re.compile(r'10\.0\.0\.'),
]

MAX_FINDINGS = 5


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    stem = p.stem.lower()
    suffixes = ''.join(p.suffixes).lower()

    # Skip test files
    if 'test' in name or 'spec' in name or '__tests__' in str(p):
        return True

    # Skip .env files
    if name.startswith('.env') or name == '.env':
        return True

    # Skip config files
    if '.config.' in name or name.endswith('.conf') or name.endswith('.config'):
        return True
    if 'docker-compose' in name:
        return True
    if stem in {'config', 'configuration', 'settings'}:
        return True

    return False


def find_hardcoded_urls(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('*'):
            continue
        for pattern in URL_PATTERNS:
            match = pattern.search(line)
            if match:
                findings.append((i, match.group()))
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
    if p is None or p.suffix.lower() not in SOURCE_EXTENSIONS:
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    findings = find_hardcoded_urls(content)
    if not findings:
        sys.exit(0)

    shown = findings[:MAX_FINDINGS]
    detail_lines = [f'  • line {lineno}: {match}' for lineno, match in shown]
    extra = f'\n  … and {len(findings) - MAX_FINDINGS} more' if len(findings) > MAX_FINDINGS else ''
    location = f' in {file_path}' if file_path else ''

    warning = (
        f'[hardcoded-url-guard] Warning: hardcoded local/private URL(s) found{location}:\n'
        + '\n'.join(detail_lines)
        + extra
        + '\n\nConsider using environment variables or config constants instead.'
    )
    print(warning, file=sys.stderr)


if __name__ == '__main__':
    main()
