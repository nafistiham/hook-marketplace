#!/usr/bin/env python3
"""
python-security-guard: Run Bandit on Python files before writing.

Wraps the bandit binary (Apache 2.0 license).
Blocks on HIGH severity findings; warns on MEDIUM.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SKIP_PATTERNS = ['test_', '_test.py', 'conftest.py', 'fixture', 'mock']


def should_skip(file_path: str) -> bool:
    name = Path(file_path).name.lower()
    return any(pat in name for pat in SKIP_PATTERNS)


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

    p = Path(file_path) if file_path else Path('unknown.py')
    if p.suffix.lower() != '.py':
        sys.exit(0)

    if should_skip(file_path):
        sys.exit(0)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False, encoding='utf-8'
        ) as f:
            f.write(content)
            tmp_path = f.name

        result = subprocess.run(
            [
                'bandit',
                '--format', 'json',
                '--severity-level', 'medium',
                '--confidence-level', 'medium',
                '--quiet',
                tmp_path,
            ],
            capture_output=True, text=True, timeout=20,
        )
    except FileNotFoundError:
        sys.exit(0)  # bandit not installed
    except subprocess.TimeoutExpired:
        sys.exit(0)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    # bandit exits 1 if issues found, 0 if clean
    if result.returncode not in (0, 1):
        sys.exit(0)

    try:
        data = json.loads(result.stdout)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    issues = data.get('results', [])
    if not issues:
        sys.exit(0)

    high = [i for i in issues if i.get('issue_severity') == 'HIGH']
    medium = [i for i in issues if i.get('issue_severity') == 'MEDIUM']

    if medium and not high:
        sys.stderr.write(f'\n⚠ python-security-guard: {len(medium)} MEDIUM issue(s) in {file_path}:\n')
        for m in medium[:4]:
            test_id = m.get('test_id', '')
            line = m.get('line_number', '?')
            msg = m.get('issue_text', '')
            sys.stderr.write(f'  [{test_id}] line {line}: {msg}\n')
        sys.exit(0)

    if not high:
        sys.exit(0)

    findings = []
    for h in high[:6]:
        test_id = h.get('test_id', '')
        line = h.get('line_number', '?')
        msg = h.get('issue_text', '')
        findings.append(f'  • [{test_id}] line {line}: {msg}')

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Bandit found {len(high)} HIGH severity issue(s) in {file_path}:\n'
            + '\n'.join(findings)
            + (f'\n  … and {len(high)-6} more' if len(high) > 6 else '')
            + f'\n  ({len(medium)} MEDIUM issue(s) also found)'
            + '\n\nFix these security issues before saving.'
        ),
    }))


if __name__ == '__main__':
    main()
