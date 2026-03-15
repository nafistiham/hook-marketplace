#!/usr/bin/env python3
"""
no-sleep-guard: Warn about sleep/delay calls in production code.

Patterns detected:
  Python:  time.sleep(, asyncio.sleep(
  JS/TS:   new Promise(resolve => setTimeout, await sleep(, await delay(
  Java:    Thread.sleep(
  Go:      time.Sleep(

Skips test files and comment lines. Warns to stderr unless the sleep value
exceeds 60 seconds, in which case the write is blocked.
"""

import json
import re
import sys
from pathlib import Path

SUPPORTED_EXTENSIONS = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go'}

# Patterns that detect sleeps. Grouped by label for reporting.
SLEEP_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # Python
    (re.compile(r'\btime\.sleep\s*\('), 'time.sleep('),
    (re.compile(r'\basyncio\.sleep\s*\('), 'asyncio.sleep('),
    # JS/TS
    (re.compile(r'new\s+Promise\s*\(\s*resolve\s*=>\s*setTimeout'), 'new Promise(resolve => setTimeout'),
    (re.compile(r'\bawait\s+sleep\s*\('), 'await sleep('),
    (re.compile(r'\bawait\s+delay\s*\('), 'await delay('),
    # Java
    (re.compile(r'\bThread\.sleep\s*\('), 'Thread.sleep('),
    # Go
    (re.compile(r'\btime\.Sleep\s*\('), 'time.Sleep('),
]

# Attempt to extract a numeric sleep value (seconds for Python, ms for JS/Java)
# so we can escalate to a block for long sleeps.
RE_SLEEP_VALUE = re.compile(r'(?:sleep|Sleep|delay)\s*\(\s*(\d+(?:\.\d+)?)')

# Threshold: block if sleep >= 60 seconds.
# Python uses seconds; JS/Java use milliseconds (so 60000 ms = 60 s).
PYTHON_BLOCK_THRESHOLD = 60.0
JS_JAVA_BLOCK_THRESHOLD = 60_000.0


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def is_comment_line(line: str, ext: str) -> bool:
    stripped = line.lstrip()
    if stripped.startswith('#'):
        return True
    if ext in {'.js', '.ts', '.jsx', '.tsx', '.java', '.go'}:
        if stripped.startswith('//') or stripped.startswith('*'):
            return True
    return False


def check_long_sleep(line: str, ext: str) -> bool:
    """Return True if the sleep value in this line exceeds the block threshold."""
    match = RE_SLEEP_VALUE.search(line)
    if not match:
        return False
    value = float(match.group(1))
    if ext == '.py':
        return value >= PYTHON_BLOCK_THRESHOLD
    else:
        return value >= JS_JAVA_BLOCK_THRESHOLD


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
    if p is None or p.suffix.lower() not in SUPPORTED_EXTENSIONS:
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    ext = p.suffix.lower()
    findings: list[tuple[int, str, bool]] = []  # (lineno, label, is_long)

    for i, line in enumerate(content.splitlines(), 1):
        if is_comment_line(line, ext):
            continue
        for pattern, label in SLEEP_PATTERNS:
            if pattern.search(line):
                is_long = check_long_sleep(line, ext)
                findings.append((i, label, is_long))
                break

    if not findings:
        sys.exit(0)

    long_sleeps = [(lineno, label) for lineno, label, is_long in findings if is_long]
    location = f' in {file_path}' if file_path else ''

    if long_sleeps:
        detail_lines = [f'  • line {lineno}: {label}' for lineno, label in long_sleeps]
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'Found {len(long_sleeps)} sleep call(s) exceeding 60 seconds{location}:\n'
                + '\n'.join(detail_lines)
                + '\n\nSleep values > 60 seconds are almost always a bug. '
                'Use proper retry logic, event-driven patterns, or reduce the sleep duration.'
            ),
        }))
        return

    detail_lines = [f'  • line {lineno}: {label}' for lineno, label, _ in findings]
    warning = (
        f'[no-sleep-guard] Warning: {len(findings)} sleep/delay call(s) found{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nSleeps can indicate polling anti-patterns. '
        'Consider event-driven or callback-based alternatives.'
    )
    print(warning, file=sys.stderr)


if __name__ == '__main__':
    main()
