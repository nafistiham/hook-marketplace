#!/usr/bin/env python3
"""
semgrep-guard: Run Semgrep security scan before writing code.

Writes content to a temp file, runs semgrep with the auto config,
and blocks if any ERROR-severity findings are found.
WARNING-level findings are reported but do not block.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SUPPORTED_EXTENSIONS = {
    '.py', '.js', '.jsx', '.ts', '.tsx', '.go', '.java',
    '.rb', '.php', '.cs', '.rs', '.swift', '.kt',
}

SKIP_PATTERNS = ['node_modules', 'dist', 'build', '__pycache__', 'vendor']


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

    p = Path(file_path) if file_path else Path('unknown')
    if p.suffix not in SUPPORTED_EXTENSIONS:
        sys.exit(0)

    for skip in SKIP_PATTERNS:
        if skip in str(p):
            sys.exit(0)

    # Write to temp file preserving extension so semgrep uses correct rules
    suffix = p.suffix or '.py'
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix=suffix, delete=False, encoding='utf-8'
        ) as f:
            f.write(content)
            tmp_path = f.name

        result = subprocess.run(
            [
                'semgrep', 'scan',
                '--config', 'auto',
                '--json',
                '--quiet',
                '--no-git-ignore',
                tmp_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        sys.exit(0)  # semgrep not installed — skip silently
    except subprocess.TimeoutExpired:
        sys.stderr.write('⚠ semgrep-guard: timed out\n')
        sys.exit(0)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    if result.returncode not in (0, 1):
        sys.exit(0)  # semgrep internal error — don't block

    try:
        data = json.loads(result.stdout)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    results = data.get('results', [])
    if not results:
        sys.exit(0)

    errors = [r for r in results if r.get('extra', {}).get('severity') == 'ERROR']
    warnings = [r for r in results if r.get('extra', {}).get('severity') in ('WARNING', 'INFO')]

    if warnings and not errors:
        for w in warnings[:3]:
            msg = w.get('extra', {}).get('message', '')
            rule = w.get('check_id', '')
            line = w.get('start', {}).get('line', '?')
            sys.stderr.write(f'  ⚠ semgrep [{rule}] line {line}: {msg}\n')
        sys.exit(0)

    if not errors:
        sys.exit(0)

    findings = []
    for e in errors[:5]:
        rule = e.get('check_id', 'unknown')
        line = e.get('start', {}).get('line', '?')
        msg = e.get('extra', {}).get('message', '')
        findings.append(f'  • [{rule}] line {line}: {msg}')

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Semgrep found {len(errors)} security issue(s) in {file_path}:\n'
            + '\n'.join(findings)
            + ('\n  … and more' if len(errors) > 5 else '')
            + '\n\nFix these issues before writing the file.'
        ),
    }))


if __name__ == '__main__':
    main()
