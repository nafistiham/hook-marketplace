#!/usr/bin/env python3
"""
dockerfile-secrets-guard: Block secrets baked into Dockerfiles.

Scans Dockerfile content for:
  - ENV instructions with secret-looking names (*_KEY, *_SECRET, *_TOKEN,
    *_PASSWORD, *_PWD, DATABASE_URL) — block, these are baked into image layers.
  - ARG instructions with the same naming patterns — warn, ARG values do not
    persist but hint that secret handling may be unsafe.
  - RUN instructions containing password=, secret=, token= inline — block.

Only processes files named Dockerfile, Dockerfile.*, or *.dockerfile.
"""

import json
import re
import sys
from pathlib import Path

SECRET_NAME_RE = re.compile(
    r'\b\w*(_KEY|_SECRET|_TOKEN|_PASSWORD|_PWD|DATABASE_URL)\b',
    re.IGNORECASE,
)

ENV_RE = re.compile(r'^\s*ENV\s+(.+)$', re.IGNORECASE)
ARG_RE = re.compile(r'^\s*ARG\s+(\w+)', re.IGNORECASE)
RUN_SECRET_RE = re.compile(
    r'^\s*RUN\b.*\b(password\s*=|secret\s*=|token\s*=|-p\s+\S{6,})',
    re.IGNORECASE,
)


def is_dockerfile(p: Path) -> bool:
    name = p.name.lower()
    return (
        name == 'dockerfile'
        or name.startswith('dockerfile.')
        or name.endswith('.dockerfile')
    )


def find_secret_env(line: str, lineno: int) -> tuple[str, str] | None:
    m = ENV_RE.match(line)
    if not m:
        return None
    env_body = m.group(1)
    # ENV can be:  KEY=VALUE  or  KEY VALUE  (legacy form)
    # Split on first = or whitespace to get the variable name.
    name_match = re.match(r'(\w+)', env_body)
    if not name_match:
        return None
    var_name = name_match.group(1)
    if SECRET_NAME_RE.search(var_name):
        return ('block', f'line {lineno}: ENV {var_name} — secret baked into image layer')
    return None


def find_secret_arg(line: str, lineno: int) -> tuple[str, str] | None:
    m = ARG_RE.match(line)
    if not m:
        return None
    var_name = m.group(1)
    if SECRET_NAME_RE.search(var_name):
        return ('warn', f'line {lineno}: ARG {var_name} — secret-named build arg (use Docker BuildKit secrets instead)')
    return None


def find_run_secret(line: str, lineno: int) -> tuple[str, str] | None:
    if RUN_SECRET_RE.match(line):
        return ('block', f'line {lineno}: RUN instruction contains inline credentials')
    return None


def scan_dockerfile(content: str) -> tuple[list[str], list[str]]:
    block_findings: list[str] = []
    warn_findings: list[str] = []

    for i, line in enumerate(content.splitlines(), 1):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        result = find_secret_env(line, i)
        if result:
            severity, msg = result
            block_findings.append(msg)
            continue

        result = find_secret_arg(line, i)
        if result:
            severity, msg = result
            warn_findings.append(msg)
            continue

        result = find_run_secret(line, i)
        if result:
            severity, msg = result
            block_findings.append(msg)

    return block_findings, warn_findings


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

    if not is_dockerfile(p):
        sys.exit(0)

    block_findings, warn_findings = scan_dockerfile(content)

    if not block_findings and not warn_findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''

    if block_findings:
        detail_lines = [f'  • {msg}' for msg in block_findings]
        warn_section = ''
        if warn_findings:
            warn_detail = '\n'.join(f'  • {msg}' for msg in warn_findings)
            warn_section = f'\n\nAdditional warnings:\n{warn_detail}'
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'Found {len(block_findings)} secret(s) baked into Dockerfile{location}:\n'
                + '\n'.join(detail_lines)
                + warn_section
                + '\n\nSecrets in ENV or RUN instructions are stored in image layers and '
                'visible in "docker history". '
                'Use Docker BuildKit secrets (--secret id=...) or runtime environment '
                'injection instead.'
            ),
        }))
        return

    # Warn-only (ARG findings).
    detail_lines = [f'  • {msg}' for msg in warn_findings]
    print(
        f'[dockerfile-secrets-guard] Secret-named ARG instructions{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nARG values do not persist in the final image, but they may be visible '
        'in build logs and intermediate layers. '
        'Prefer Docker BuildKit secrets for sensitive build-time values.',
        file=sys.stderr,
    )

    sys.exit(0)


if __name__ == '__main__':
    main()
