#!/usr/bin/env python3
"""
kubernetes-resource-guard: Validate Kubernetes manifests for security and resource hygiene.

Only runs on .yaml/.yml files that look like Kubernetes manifests (contain apiVersion: and kind:).
- Containers with privileged: true → BLOCK
- Containers without resources.limits → warn to stderr
- Pod/Deployment without securityContext → warn to stderr

Uses regex-based scanning to avoid a YAML dependency.
"""

import json
import re
import sys
from pathlib import Path

YAML_EXTENSIONS = {'.yaml', '.yml'}

RE_API_VERSION = re.compile(r'^\s*apiVersion\s*:', re.MULTILINE)
RE_KIND = re.compile(r'^\s*kind\s*:', re.MULTILINE)
RE_KIND_VALUE = re.compile(r'^\s*kind\s*:\s*(\w+)', re.MULTILINE)
RE_PRIVILEGED = re.compile(r'^\s*privileged\s*:\s*true\b', re.MULTILINE)
RE_RESOURCES_LIMITS = re.compile(r'^\s*limits\s*:', re.MULTILINE)
RE_SECURITY_CONTEXT = re.compile(r'^\s*securityContext\s*:', re.MULTILINE)

WORKLOAD_KINDS = {'Pod', 'Deployment', 'DaemonSet', 'StatefulSet', 'ReplicaSet', 'Job', 'CronJob'}


def is_k8s_manifest(content: str) -> bool:
    return bool(RE_API_VERSION.search(content) and RE_KIND.search(content))


def get_kind(content: str) -> str:
    match = RE_KIND_VALUE.search(content)
    return match.group(1) if match else ''


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
    if p is None or p.suffix.lower() not in YAML_EXTENSIONS:
        sys.exit(0)

    if not is_k8s_manifest(content):
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    kind = get_kind(content)

    # BLOCK: privileged containers
    if RE_PRIVILEGED.search(content):
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'Kubernetes manifest{location} contains privileged: true.\n\n'
                'Privileged containers have full host access and are a critical security risk. '
                'Remove privileged: true or use specific capabilities instead.'
            ),
        }))
        return

    # Warn: missing resource limits
    warnings: list[str] = []
    if not RE_RESOURCES_LIMITS.search(content):
        warnings.append(
            '  • No resource limits (resources.limits) found. '
            'Add memory and cpu limits to prevent runaway containers.'
        )

    # Warn: workload kinds without securityContext
    if kind in WORKLOAD_KINDS and not RE_SECURITY_CONTEXT.search(content):
        warnings.append(
            f'  • {kind} has no securityContext. '
            'Consider adding runAsNonRoot: true, readOnlyRootFilesystem: true, etc.'
        )

    if warnings:
        warning = (
            f'[kubernetes-resource-guard] Warning: security/resource issues found{location}:\n'
            + '\n'.join(warnings)
        )
        print(warning, file=sys.stderr)


if __name__ == '__main__':
    main()
