#!/usr/bin/env python3
"""
shellcheck-guard: Run ShellCheck on shell scripts before writing.

Wraps the shellcheck binary. Only blocks on ERROR severity;
warnings are printed to stderr.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SHELL_EXTENSIONS = {'.sh', '.bash', '.zsh', '.ksh', '.dash'}
SHELL_SHEBANGS = {'#!/bin/sh', '#!/bin/bash', '#!/usr/bin/env bash',
                  '#!/usr/bin/env sh', '#!/bin/zsh', '#!/usr/bin/env zsh'}


def is_shell_script(file_path: str, content: str) -> bool:
    p = Path(file_path)
    if p.suffix.lower() in SHELL_EXTENSIONS:
        return True
    first_line = content.split('\n', 1)[0].strip()
    return first_line in SHELL_SHEBANGS


def detect_shell(content: str) -> str:
    first_line = content.split('\n', 1)[0].strip()
    if 'bash' in first_line:
        return 'bash'
    if 'zsh' in first_line:
        return 'bash'  # shellcheck uses bash dialect for zsh
    return 'sh'


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

    if not is_shell_script(file_path, content):
        sys.exit(0)

    shell = detect_shell(content)
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.sh', delete=False, encoding='utf-8'
        ) as f:
            f.write(content)
            tmp_path = f.name

        result = subprocess.run(
            ['shellcheck', '--format=json', f'--shell={shell}', tmp_path],
            capture_output=True, text=True, timeout=15,
        )
    except FileNotFoundError:
        sys.exit(0)  # shellcheck not installed
    except subprocess.TimeoutExpired:
        sys.exit(0)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    if result.returncode == 0:
        sys.exit(0)  # Clean

    try:
        issues = json.loads(result.stdout)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    errors = [i for i in issues if i.get('level') == 'error']
    warnings = [i for i in issues if i.get('level') in ('warning', 'info', 'style')]

    if warnings and not errors:
        sys.stderr.write(f'\n⚠ shellcheck-guard: {len(warnings)} warning(s) in {file_path or "script"}:\n')
        for w in warnings[:5]:
            code = w.get('code', '')
            line = w.get('line', '?')
            msg = w.get('message', '')
            sys.stderr.write(f'  SC{code} line {line}: {msg}\n')
        sys.exit(0)

    if not errors:
        sys.exit(0)

    findings = []
    for e in errors[:8]:
        code = e.get('code', '')
        line = e.get('line', '?')
        msg = e.get('message', '')
        fix = e.get('fix', {})
        findings.append(f'  • SC{code} line {line}: {msg}')

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'ShellCheck found {len(errors)} error(s) in {file_path or "script"}:\n'
            + '\n'.join(findings)
            + (f'\n  … and {len(errors)-8} more' if len(errors) > 8 else '')
            + '\n\nFix these shell scripting errors before saving.'
        ),
    }))


if __name__ == '__main__':
    main()
