#!/usr/bin/env python3
"""
no-eval-guard: Block eval() and equivalent dynamic code execution patterns.

JS/TS: eval(, new Function(, setTimeout(" or setInterval("
Python: eval(, exec(, compile(

Skips comment lines and test files. Blocks with exact line numbers found.
"""

import json
import re
import sys
from pathlib import Path

JS_EXTENSIONS = {'.js', '.ts', '.jsx', '.tsx'}
PY_EXTENSION = '.py'

JS_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\beval\s*\('), 'eval('),
    (re.compile(r'\bnew\s+Function\s*\('), 'new Function('),
    (re.compile(r'\bsetTimeout\s*\(\s*["\']'), 'setTimeout(string)'),
    (re.compile(r'\bsetInterval\s*\(\s*["\']'), 'setInterval(string)'),
]

PY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\beval\s*\('), 'eval('),
    (re.compile(r'\bexec\s*\('), 'exec('),
    (re.compile(r'\bcompile\s*\('), 'compile('),
]


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def is_comment_line(line: str, extension: str) -> bool:
    stripped = line.lstrip()
    if stripped.startswith('#'):
        return True
    if extension in JS_EXTENSIONS and (stripped.startswith('//') or stripped.startswith('*')):
        return True
    return False


def find_eval_patterns(
    content: str,
    patterns: list[tuple[re.Pattern[str], str]],
    extension: str,
) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        if is_comment_line(line, extension):
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

    ext = p.suffix.lower()
    if ext not in JS_EXTENSIONS and ext != PY_EXTENSION:
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    patterns = JS_PATTERNS if ext in JS_EXTENSIONS else PY_PATTERNS
    findings = find_eval_patterns(content, patterns, ext)

    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in findings]

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Found {len(findings)} dynamic code execution pattern(s){location}:\n'
            + '\n'.join(detail_lines)
            + '\n\neval() and equivalent patterns are a security risk. '
            'Use safer alternatives (JSON.parse, explicit function references, etc.).'
        ),
    }))


if __name__ == '__main__':
    main()
