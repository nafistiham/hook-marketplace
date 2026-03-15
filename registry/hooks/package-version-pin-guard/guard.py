#!/usr/bin/env python3
"""
package-version-pin-guard: Warn when package.json dependencies use unpinned version ranges.

Checks dependencies and devDependencies for values starting with ^ or ~.
Skips workspace root package.json files (those with a "workspaces" field).
Reports up to 8 unpinned packages to stderr without blocking.
"""

import json
import sys
from pathlib import Path

MAX_FINDINGS = 8


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
    if p is None or p.name.lower() != 'package.json':
        sys.exit(0)

    # Exclude package-lock.json just in case matcher is broad
    if 'lock' in p.name.lower():
        sys.exit(0)

    try:
        pkg = json.loads(content)
    except json.JSONDecodeError:
        # Let json-syntax-guard handle the parse error
        sys.exit(0)

    # Skip workspace roots
    if 'workspaces' in pkg:
        sys.exit(0)

    unpinned: list[tuple[str, str, str]] = []
    for section in ('dependencies', 'devDependencies'):
        deps = pkg.get(section, {})
        if not isinstance(deps, dict):
            continue
        for name, version in deps.items():
            if isinstance(version, str) and version and version[0] in ('^', '~'):
                unpinned.append((section, name, version))

    if not unpinned:
        sys.exit(0)

    shown = unpinned[:MAX_FINDINGS]
    detail_lines = [
        f'  • [{section}] {name}: {version}'
        for section, name, version in shown
    ]
    extra = (
        f'\n  … and {len(unpinned) - MAX_FINDINGS} more'
        if len(unpinned) > MAX_FINDINGS
        else ''
    )
    location = f' in {file_path}' if file_path else ''

    warning = (
        f'[package-version-pin-guard] Warning: {len(unpinned)} unpinned dependency version(s) found{location}:\n'
        + '\n'.join(detail_lines)
        + extra
        + '\n\nConsider pinning exact versions for reproducible builds (remove ^ or ~).'
    )
    print(warning, file=sys.stderr)


if __name__ == '__main__':
    main()
