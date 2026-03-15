#!/usr/bin/env python3
"""
unused-import-guard: Warn about unused imports in Python files.

Uses a heuristic name-presence check: collects imported names from
'import X' and 'from X import Y' statements, then checks whether each
name appears anywhere else in the file. Reports up to 5 unused imports.
Skips test files and __init__.py. Does not block.
"""

import json
import re
import sys
from pathlib import Path

IMPORT_RE = re.compile(r'^\s*import\s+([\w,\s]+)$')
FROM_IMPORT_RE = re.compile(r'^\s*from\s+[\w.]+\s+import\s+([\w,\s*]+)$')
ALIAS_RE = re.compile(r'(\w+)\s+as\s+(\w+)')

MAX_WARNINGS = 5


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    if name == '__init__.py':
        return True
    return 'test' in name or 'spec' in name or '__tests__' in str(p)


def collect_imports(lines: list[str]) -> list[tuple[int, str]]:
    """Return list of (lineno, imported_name) for each imported name."""
    imports: list[tuple[int, str]] = []
    for i, line in enumerate(lines, 1):
        # Handle 'import X' and 'import X as Y'
        m = IMPORT_RE.match(line)
        if m:
            raw = m.group(1)
            for part in raw.split(','):
                part = part.strip()
                alias_m = ALIAS_RE.search(part)
                if alias_m:
                    imports.append((i, alias_m.group(2)))
                else:
                    name = part.split('.')[0].strip()
                    if name:
                        imports.append((i, name))
            continue

        # Handle 'from X import Y, Z' and 'from X import Y as Z'
        m = FROM_IMPORT_RE.match(line)
        if m:
            raw = m.group(1)
            if raw.strip() == '*':
                continue
            for part in raw.split(','):
                part = part.strip()
                alias_m = ALIAS_RE.search(part)
                if alias_m:
                    imports.append((i, alias_m.group(2)))
                else:
                    name = part.strip()
                    if name:
                        imports.append((i, name))

    return imports


def find_unused_imports(lines: list[str]) -> list[tuple[int, str]]:
    imports = collect_imports(lines)
    if not imports:
        return []

    # Build a searchable body: all lines except the import lines themselves.
    import_line_nos = {lineno for lineno, _ in imports}
    body = ' '.join(
        line for i, line in enumerate(lines, 1) if i not in import_line_nos
    )

    unused: list[tuple[int, str]] = []
    seen_names: set[str] = set()
    for lineno, name in imports:
        if name in seen_names:
            continue
        seen_names.add(name)
        # Use word-boundary search to avoid partial matches.
        if not re.search(r'\b' + re.escape(name) + r'\b', body):
            unused.append((lineno, name))

    return unused[:MAX_WARNINGS]


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

    if p.suffix.lower() != '.py':
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    lines = content.splitlines()
    unused = find_unused_imports(lines)
    if not unused:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {name}' for lineno, name in unused]

    print(
        f'[unused-import-guard] {len(unused)} unused import(s) detected{location}:\n'
        + '\n'.join(detail_lines)
        + '\n\nUnused imports increase cognitive load and may slow startup. '
        'Remove them or suppress with "# noqa: F401" if they are intentional re-exports.',
        file=sys.stderr,
    )

    sys.exit(0)


if __name__ == '__main__':
    main()
