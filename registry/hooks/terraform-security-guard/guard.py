#!/usr/bin/env python3
"""
terraform-security-guard: Run tfsec or checkov on Terraform files before writing.

Tries tfsec first, then checkov as fallback. Blocks on HIGH/CRITICAL findings.
Falls back gracefully if neither tool is installed. Requires tfsec or checkov.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

TERRAFORM_EXTENSION = '.tf'


def run_tfsec(tmp_path: str) -> tuple[bool, str] | None:
    """Run tfsec. Returns (should_block, reason) or None if not installed."""
    try:
        result = subprocess.run(
            ['tfsec', '--format', 'json', '--include-passed', tmp_path],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        return None
    except subprocess.TimeoutExpired:
        return (False, '')

    try:
        data = json.loads(result.stdout)
    except (json.JSONDecodeError, ValueError):
        return (False, '')

    results = data.get('results', [])
    critical = [r for r in results if r.get('severity') in ('HIGH', 'CRITICAL')]
    warnings = [r for r in results if r.get('severity') in ('MEDIUM', 'LOW')]

    if not critical:
        if warnings:
            sys.stderr.write(f'\n⚠ terraform-security-guard (tfsec): {len(warnings)} warning(s)\n')
            for w in warnings[:3]:
                desc = w.get('description', '')
                rule = w.get('rule_id', '')
                sys.stderr.write(f'  [{rule}] {desc}\n')
        return (False, '')

    lines = []
    for c in critical[:6]:
        rule = c.get('rule_id', '?')
        desc = c.get('description', '')
        sev = c.get('severity', '')
        lines.append(f'  • [{rule}] {sev}: {desc}')

    reason = (
        f'tfsec found {len(critical)} HIGH/CRITICAL issue(s):\n'
        + '\n'.join(lines)
        + (f'\n  … and {len(critical) - 6} more' if len(critical) > 6 else '')
        + f'\n  ({len(warnings)} lower-severity warning(s) also found)'
        + '\n\nFix these security issues before saving.'
    )
    return (True, reason)


def run_checkov(tmp_path: str) -> tuple[bool, str] | None:
    """Run checkov. Returns (should_block, reason) or None if not installed."""
    try:
        result = subprocess.run(
            ['checkov', '-f', tmp_path, '-o', 'json', '--quiet'],
            capture_output=True, text=True, timeout=60,
        )
    except FileNotFoundError:
        return None
    except subprocess.TimeoutExpired:
        return (False, '')

    try:
        data = json.loads(result.stdout)
    except (json.JSONDecodeError, ValueError):
        return (False, '')

    # checkov may return a list or a dict
    check_results = data if isinstance(data, dict) else {}
    failed = check_results.get('results', {}).get('failed_checks', [])
    passed = check_results.get('results', {}).get('passed_checks', [])

    if not failed:
        return (False, '')

    lines = []
    for f in failed[:6]:
        check_id = f.get('check_id', '?')
        check_type = f.get('check', {})
        name = check_type.get('name', '') if isinstance(check_type, dict) else str(check_type)
        lines.append(f'  • [{check_id}] {name}')

    reason = (
        f'checkov found {len(failed)} failed check(s) ({len(passed)} passed):\n'
        + '\n'.join(lines)
        + (f'\n  … and {len(failed) - 6} more' if len(failed) > 6 else '')
        + '\n\nFix these security issues before saving.'
    )
    return (True, reason)


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

    p = Path(file_path) if file_path else Path('unknown.tf')
    if p.suffix.lower() != TERRAFORM_EXTENSION:
        sys.exit(0)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.tf', delete=False, encoding='utf-8'
        ) as f:
            f.write(content)
            tmp_path = f.name

        result = run_tfsec(tmp_path)
        if result is None:
            result = run_checkov(tmp_path)

        if result is None:
            # Neither tool installed — skip silently
            sys.exit(0)

        should_block, reason = result
        if should_block:
            print(json.dumps({'decision': 'block', 'reason': reason}))
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


if __name__ == '__main__':
    main()
