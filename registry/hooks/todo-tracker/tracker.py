#!/usr/bin/env python3
"""
todo-tracker: Warn when TODO/FIXME count increases in an edited file.

Keeps a count file at ~/.hookpm/todo-counts.json. On each edit,
compares old vs new count and warns if it grew.
"""

import json
import os
import re
import sys
from pathlib import Path

TODO_RE = re.compile(r'\b(TODO|FIXME|HACK|XXX)\b', re.IGNORECASE)
COUNTS_FILE = Path(os.environ.get('HOOKPM_DIR', Path.home() / '.hookpm')) / 'todo-counts.json'


def load_counts() -> dict[str, int]:
    try:
        return json.loads(COUNTS_FILE.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def save_counts(counts: dict[str, int]) -> None:
    try:
        COUNTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        COUNTS_FILE.write_text(json.dumps(counts, indent=2))
    except OSError:
        pass


def count_todos(file_path: str) -> int:
    try:
        text = Path(file_path).read_text(encoding='utf-8', errors='replace')
        return len(TODO_RE.findall(text))
    except OSError:
        return 0


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = payload.get('tool_input', {}).get('file_path', '')
    if not file_path:
        sys.exit(0)

    counts = load_counts()
    old_count = counts.get(file_path, 0)
    new_count = count_todos(file_path)

    counts[file_path] = new_count
    save_counts(counts)

    if new_count > old_count:
        added = new_count - old_count
        sys.stderr.write(
            f'\n⚠️  todo-tracker: {file_path} now has {new_count} TODO/FIXME '
            f'({added:+d} from this edit). Consider resolving before merging.\n'
        )
    elif new_count > 0:
        sys.stderr.write(
            f'  todo-tracker: {file_path} has {new_count} TODO/FIXME (unchanged)\n'
        )


if __name__ == '__main__':
    main()
