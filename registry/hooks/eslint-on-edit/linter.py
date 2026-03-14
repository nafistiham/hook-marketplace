#!/usr/bin/env python3
"""
eslint-on-edit: Run ESLint on JS/TS files after each write.

Finds the project's eslint binary (local node_modules first,
then global) and runs it on the edited file.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

JS_TS_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'}

SKIP_PATTERNS = ['node_modules', 'dist', 'build', '.next', 'coverage']


def find_eslint(start: Path) -> str | None:
    """Walk up to find a local eslint binary, fall back to global."""
    cwd = start
    for _ in range(6):
        candidate = cwd / 'node_modules' / '.bin' / 'eslint'
        if candidate.exists():
            return str(candidate)
        if cwd.parent == cwd:
            break
        cwd = cwd.parent

    # Try global
    for name in ['eslint', 'npx']:
        result = subprocess.run(['which', name], capture_output=True, text=True)
        if result.returncode == 0:
            return name

    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = payload.get('tool_input', {}).get('file_path', '')
    if not file_path:
        sys.exit(0)

    p = Path(file_path)
    if p.suffix not in JS_TS_EXTENSIONS:
        sys.exit(0)

    for skip in SKIP_PATTERNS:
        if skip in str(p):
            sys.exit(0)

    if not p.exists():
        sys.exit(0)

    eslint = find_eslint(p.parent)
    if not eslint:
        sys.exit(0)

    cmd = [eslint, '--format=compact', '--max-warnings=0', str(p)]
    if eslint == 'npx':
        cmd = ['npx', 'eslint', '--format=compact', '--max-warnings=0', str(p)]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30,
            cwd=str(p.parent),
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        sys.exit(0)

    if result.returncode == 0:
        return  # Clean — no output needed

    sys.stderr.write(f'\n✗ eslint-on-edit: {p.name}\n')
    output = (result.stdout + result.stderr).strip()
    # Trim to keep output readable
    lines = output.split('\n')
    if len(lines) > 20:
        sys.stderr.write('\n'.join(lines[:20]))
        sys.stderr.write(f'\n  … {len(lines) - 20} more issues\n')
    else:
        sys.stderr.write(output + '\n')


if __name__ == '__main__':
    main()
