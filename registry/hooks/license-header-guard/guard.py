#!/usr/bin/env python3
"""
license-header-guard: Warn when source files lack a license header.

Checks the first 5 lines of .py, .ts, .js, .go, .java, .rs files for
common license keywords. Warns to stderr only — never blocks. Skips test,
generated, and minified files, and files shorter than 10 lines.
"""

import json
import sys
from pathlib import Path

SOURCE_EXTENSIONS = {'.py', '.ts', '.js', '.go', '.java', '.rs'}

LICENSE_KEYWORDS = {'license', 'copyright', 'spdx', 'mit', 'apache', 'gpl', 'bsd'}

TEST_PATTERNS = ['.test.', '.spec.', '_test.', '_spec.', 'test_', 'spec_']
GENERATED_PATTERNS = ['.gen.', '.pb.', '.min.']

MIN_LINES = 10
HEADER_LINES = 5


def is_skip_file(file_path: str) -> bool:
    name = Path(file_path).name.lower()
    if any(pat in name for pat in TEST_PATTERNS):
        return True
    if any(pat in name for pat in GENERATED_PATTERNS):
        return True
    return False


def has_license_header(lines: list[str]) -> bool:
    header = '\n'.join(lines[:HEADER_LINES]).lower()
    return any(kw in header for kw in LICENSE_KEYWORDS)


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
    if p is None or p.suffix.lower() not in SOURCE_EXTENSIONS:
        sys.exit(0)

    if is_skip_file(file_path):
        sys.exit(0)

    lines = content.splitlines()
    if len(lines) <= MIN_LINES:
        sys.exit(0)

    if has_license_header(lines):
        sys.exit(0)

    sys.stderr.write(
        f'\n⚠ license-header-guard: {file_path} has no license header in the first {HEADER_LINES} lines.\n'
        f'  Add a license comment (e.g. // SPDX-License-Identifier: MIT) at the top of the file.\n'
    )


if __name__ == '__main__':
    main()
