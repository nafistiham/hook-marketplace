#!/usr/bin/env python3
"""
long-line-guard: Warn when code files contain lines over 120 characters.

Runs on .ts, .js, .py, .go, .java, .rs, .rb, .sh files.
Skips minified files (*.min.*), generated files (*.pb.*, *.gen.*), and markdown.
Shows up to 3 worst offenders with line number and length.
"""

import json
import sys
from pathlib import Path

LINE_LIMIT = 120
MAX_EXAMPLES = 3

CODE_EXTENSIONS = {'.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.rs', '.rb', '.sh'}


def is_skipped_file(p: Path) -> bool:
    name = p.name.lower()
    # Minified files
    if '.min.' in name:
        return True
    # Generated files
    if '.pb.' in name or '.gen.' in name:
        return True
    # Markdown
    if p.suffix.lower() in {'.md', '.mdx'}:
        return True
    return False


def find_long_lines(content: str) -> list[tuple[int, int]]:
    """Return (line_number, length) for lines exceeding LINE_LIMIT."""
    results: list[tuple[int, int]] = []
    for i, line in enumerate(content.splitlines(), 1):
        length = len(line.rstrip('\n\r'))
        if length > LINE_LIMIT:
            results.append((i, length))
    return results


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
    if p is None or p.suffix.lower() not in CODE_EXTENSIONS:
        sys.exit(0)

    if is_skipped_file(p):
        sys.exit(0)

    long_lines = find_long_lines(content)
    if not long_lines:
        sys.exit(0)

    # Sort by length descending to show worst offenders first
    worst = sorted(long_lines, key=lambda t: t[1], reverse=True)[:MAX_EXAMPLES]
    detail_lines = [f'  • line {lineno}: {length} chars' for lineno, length in worst]
    location = f' in {file_path}' if file_path else ''

    warning = (
        f'[long-line-guard] Warning: {len(long_lines)} line(s) exceed {LINE_LIMIT} characters{location}.\n'
        f'Longest offenders:\n'
        + '\n'.join(detail_lines)
        + '\n\nConsider wrapping long lines to improve readability.'
    )
    print(warning, file=sys.stderr)


if __name__ == '__main__':
    main()
