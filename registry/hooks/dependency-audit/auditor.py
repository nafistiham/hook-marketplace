#!/usr/bin/env python3
"""
dependency-audit: Run security audit after package installs.

Detects npm/pnpm/yarn/pip install commands and runs the appropriate
audit tool, printing any vulnerabilities to stderr.
"""

import json
import re
import subprocess
import sys

# Patterns that indicate a package install happened
NPM_INSTALL_RE = re.compile(
    r'\b(npm\s+install|npm\s+i|pnpm\s+add|pnpm\s+install|yarn\s+add)\b',
    re.IGNORECASE,
)
PIP_INSTALL_RE = re.compile(r'\bpip\d*\s+install\b', re.IGNORECASE)


def run(cmd: list[str], cwd: str | None = None) -> tuple[int, str, str]:
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60, cwd=cwd,
        )
        return result.returncode, result.stdout, result.stderr
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return -1, '', ''


def npm_audit() -> None:
    code, out, _ = run(['npm', 'audit', '--audit-level=high'])
    if code == 0:
        sys.stderr.write('✓ dependency-audit: no high/critical npm vulnerabilities found\n')
    elif code > 0:
        sys.stderr.write('⚠️  dependency-audit: npm audit found vulnerabilities:\n')
        sys.stderr.write(out[-2000:])


def pip_audit() -> None:
    code, out, _ = run(['pip-audit', '--format=columns'])
    if code == -1:
        # pip-audit not installed — try safety
        code, out, _ = run(['safety', 'check'])
        if code == -1:
            return  # Neither tool available
    if code == 0:
        sys.stderr.write('✓ dependency-audit: no Python vulnerabilities found\n')
    else:
        sys.stderr.write('⚠️  dependency-audit: Python vulnerabilities found:\n')
        sys.stderr.write(out[-2000:])


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    command = payload.get('tool_input', {}).get('command', '')
    if not command:
        sys.exit(0)

    if NPM_INSTALL_RE.search(command):
        sys.stderr.write('\n▶ dependency-audit: running npm audit…\n')
        npm_audit()
    elif PIP_INSTALL_RE.search(command):
        sys.stderr.write('\n▶ dependency-audit: running pip audit…\n')
        pip_audit()


if __name__ == '__main__':
    main()
