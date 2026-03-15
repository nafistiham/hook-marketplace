#!/usr/bin/env python3
"""
prototype-pollution-guard: Block prototype pollution patterns in JS/TS files.

Blocks clear __proto__ access. Warns on constructor.prototype manipulation
and Object.assign with potentially untrusted targets. Skips test files and
comment lines. Reports exact line numbers.
"""

import json
import re
import sys
from pathlib import Path

JS_EXTENSIONS = {'.js', '.ts', '.jsx', '.tsx'}

# Patterns that definitely indicate prototype pollution — block these.
BLOCK_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'__proto__\s*[\[.]'), '__proto__ access'),
    (re.compile(r'__proto__\s*='), '__proto__ assignment'),
]

# Patterns that are suspicious but require human judgment — warn on these.
WARN_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\bconstructor\s*\['), 'constructor[...] access (potential prototype chain walk)'),
    (re.compile(r'Object\.assign\s*\(\s*\{\s*\}'), 'Object.assign({}, ...) — verify source is trusted'),
]


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def is_comment_line(line: str) -> bool:
    stripped = line.lstrip()
    return stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('#')


def scan_patterns(
    content: str,
    patterns: list[tuple[re.Pattern[str], str]],
) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        if is_comment_line(line):
            continue
        for pattern, label in patterns:
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

    if p.suffix.lower() not in JS_EXTENSIONS:
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    block_findings = scan_patterns(content, BLOCK_PATTERNS)
    warn_findings = scan_patterns(content, WARN_PATTERNS)

    if not block_findings and not warn_findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''

    if block_findings:
        detail_lines = [f'  • line {lineno}: {label}' for lineno, label in block_findings]
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'Found {len(block_findings)} prototype pollution pattern(s){location}:\n'
                + '\n'.join(detail_lines)
                + '\n\nDirect __proto__ access allows attackers to modify Object.prototype, '
                'corrupting shared state for all objects. '
                'Use Object.create(null) for data maps or validate keys against an allowlist.'
            ),
        }))
        return

    # Warn-only findings.
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in warn_findings]
    print(
        f'[prototype-pollution-guard] Suspicious prototype access{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nVerify that object keys cannot be controlled by user input. '
        'Consider Object.create(null) for dictionaries or explicit key validation.',
        file=sys.stderr,
    )

    sys.exit(0)


if __name__ == '__main__':
    main()
