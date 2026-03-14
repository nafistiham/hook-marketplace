#!/usr/bin/env python3
"""
dockerfile-lint: Independent Dockerfile linter.

Checks for common Dockerfile anti-patterns without relying on hadolint.
Covers the most impactful rules from hadolint's DL and SC rule sets.
"""

import json
import re
import sys
from pathlib import Path

# ─── Rules ────────────────────────────────────────────────────────────────────

Finding = tuple[str, str, str]  # (rule_id, severity, message)


def check(content: str) -> list[Finding]:
    findings: list[Finding] = []
    lines = content.splitlines()

    has_user = False
    has_healthcheck = False
    run_count = 0
    consecutive_run_start = -1

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        upper = stripped.upper()

        # DL3002: Last USER should not be root
        if upper.startswith('USER '):
            user = stripped.split(None, 1)[1].strip().lower()
            if user in ('root', '0'):
                findings.append(('DL3002', 'ERROR', f'Line {i}: Last USER is root — run as a non-root user'))
            else:
                has_user = True

        # DL3007: Using latest tag
        if upper.startswith('FROM ') and ':latest' in stripped.lower():
            findings.append(('DL3007', 'WARNING', f'Line {i}: Using :latest tag is unpredictable — pin a specific version'))

        if upper.startswith('FROM ') and ':' not in stripped.split()[-1] and '@' not in stripped:
            image = stripped.split()[-1]
            if image.upper() not in ('AS', 'SCRATCH') and '${' not in image:
                findings.append(('DL3007', 'WARNING', f'Line {i}: No tag specified for image — pin a version to ensure reproducible builds'))

        # DL3020: Use COPY instead of ADD for local files
        if upper.startswith('ADD '):
            src = stripped.split(None, 2)[1] if len(stripped.split()) >= 2 else ''
            if not src.startswith('http://') and not src.startswith('https://'):
                findings.append(('DL3020', 'ERROR', f'Line {i}: Use COPY instead of ADD for local files — ADD has unexpected tar extraction behavior'))

        # DL3059: Multiple consecutive RUN instructions
        if upper.startswith('RUN '):
            if consecutive_run_start == -1:
                consecutive_run_start = i
                run_count = 1
            else:
                run_count += 1
        else:
            if run_count >= 3:
                findings.append(('DL3059', 'WARNING', f'Lines {consecutive_run_start}-{i-1}: {run_count} consecutive RUN instructions — chain with && to reduce layers'))
            consecutive_run_start = -1
            run_count = 0

        # DL3025: Use CMD in JSON array form
        if upper.startswith('CMD ') and not stripped[4:].strip().startswith('['):
            findings.append(('DL3025', 'WARNING', f'Line {i}: Use CMD in JSON array form: CMD ["executable", "arg"] to avoid shell interpretation'))

        # DL3026: Use ENTRYPOINT in JSON array form
        if upper.startswith('ENTRYPOINT ') and not stripped[11:].strip().startswith('['):
            findings.append(('DL3026', 'WARNING', f'Line {i}: Use ENTRYPOINT in JSON array form: ENTRYPOINT ["executable"]'))

        # SC2046 / DL4006: Dangerous pipes without set -o pipefail
        if upper.startswith('RUN ') and '|' in stripped and 'pipefail' not in stripped:
            if 'set -' not in stripped:
                findings.append(('DL4006', 'WARNING', f'Line {i}: Pipe in RUN without pipefail — add: RUN set -o pipefail && ...'))

        # DL3008: Pin apt-get package versions
        if 'apt-get install' in stripped.lower() and '=' not in stripped and '--no-install-recommends' not in stripped:
            findings.append(('DL3008', 'WARNING', f'Line {i}: Pin apt-get package versions and add --no-install-recommends to reduce image size'))

        if upper.startswith('HEALTHCHECK '):
            has_healthcheck = True

        # Dangerous exposed ports
        if upper.startswith('EXPOSE '):
            ports = re.findall(r'\d+', stripped)
            dangerous = [p for p in ports if p in ('22', '23', '3389', '5900')]
            if dangerous:
                findings.append(('DL3044', 'WARNING', f'Line {i}: Exposing potentially dangerous port(s): {", ".join(dangerous)}'))

    # Check trailing consecutive RUN
    if run_count >= 3:
        findings.append(('DL3059', 'WARNING', f'Lines {consecutive_run_start}-end: {run_count} consecutive RUN instructions — chain with &&'))

    # DL3002: No non-root USER at all
    if not has_user:
        findings.append(('DL3002', 'WARNING', 'No non-root USER specified — container will run as root'))

    # DL3029: No HEALTHCHECK
    if not has_healthcheck and 'FROM' in content.upper():
        findings.append(('DL3029', 'INFO', 'No HEALTHCHECK defined — consider adding one for production images'))

    return findings


def is_dockerfile(file_path: str, content: str) -> bool:
    p = Path(file_path)
    name = p.name.lower()
    if name == 'dockerfile' or name.startswith('dockerfile.'):
        return True
    if p.suffix.lower() == '.dockerfile':
        return True
    # Detect by content
    first_lines = content[:500].upper()
    return first_lines.lstrip().startswith('FROM ')


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

    if not is_dockerfile(file_path, content):
        sys.exit(0)

    findings = check(content)
    if not findings:
        sys.exit(0)

    errors = [(r, s, m) for r, s, m in findings if s == 'ERROR']
    warnings = [(r, s, m) for r, s, m in findings if s in ('WARNING', 'INFO')]

    # Format output
    lines = []
    for rule, severity, msg in findings[:10]:
        icon = '✗' if severity == 'ERROR' else '⚠'
        lines.append(f'  {icon} [{rule}] {msg}')

    if errors:
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'Dockerfile has {len(errors)} error(s) and {len(warnings)} warning(s):\n'
                + '\n'.join(lines)
            ),
        }))
    else:
        # Warnings only — print to stderr, don't block
        sys.stderr.write(f'\n⚠ dockerfile-lint: {len(warnings)} warning(s):\n')
        for _, _, msg in warnings[:5]:
            sys.stderr.write(f'  {msg}\n')


if __name__ == '__main__':
    main()
