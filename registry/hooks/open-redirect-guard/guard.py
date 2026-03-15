#!/usr/bin/env python3
"""
open-redirect-guard: Warn about potential open redirect vulnerabilities.

Detects redirect calls where the target URL is derived from user-controlled
request parameters. Emits a warning to stderr with line numbers but does not
block — the pattern requires human judgment to distinguish safe from unsafe
usage. Skips test files.
"""

import json
import re
import sys
from pathlib import Path

APPLICABLE_EXTENSIONS = {'.py', '.js', '.ts', '.jsx', '.tsx', '.rb', '.php', '.go', '.java'}

REDIRECT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\bredirect\s*\(\s*request\.GET'), 'redirect(request.GET...)'),
    (re.compile(r'\bredirect\s*\(\s*request\.args'), 'redirect(request.args...)'),
    (re.compile(r'\bredirect\s*\(\s*params\['), 'redirect(params[...])'),
    (re.compile(r'\bres\.redirect\s*\(\s*req\.'), 'res.redirect(req....)'),
    (re.compile(r'\bresponse\.redirect\s*\(\s*request\.'), 'response.redirect(request....)'),
]


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def find_open_redirects(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        for pattern, label in REDIRECT_PATTERNS:
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

    findings = find_open_redirects(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in findings]

    print(
        f'[open-redirect-guard] Potential open redirect detected{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nRedirecting to user-supplied URLs can enable phishing attacks. '
        'Validate the redirect target against an allowlist of safe destinations '
        'or use relative paths only.',
        file=sys.stderr,
    )

    sys.exit(0)


if __name__ == '__main__':
    main()
