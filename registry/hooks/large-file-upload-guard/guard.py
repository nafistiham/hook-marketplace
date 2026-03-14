#!/usr/bin/env python3
"""
large-file-upload-guard: Block writing files larger than MAX_BYTES.

Reads the content field from the Write tool_input and checks its size
before the file is written to disk.
"""

import json
import os
import sys

MAX_BYTES = int(os.environ.get('LARGE_FILE_GUARD_MAX_BYTES', str(5 * 1024 * 1024)))  # 5MB default


def fmt_size(n: int) -> str:
    if n >= 1024 * 1024:
        return f'{n / 1024 / 1024:.1f}MB'
    if n >= 1024:
        return f'{n / 1024:.1f}KB'
    return f'{n}B'


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    content = tool_input.get('content', '')
    file_path = tool_input.get('file_path', 'unknown')

    if not content:
        sys.exit(0)

    size = len(content.encode('utf-8'))
    if size <= MAX_BYTES:
        sys.exit(0)

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'File is {fmt_size(size)}, which exceeds the {fmt_size(MAX_BYTES)} limit.\n'
            f'Path: {file_path}\n'
            f'Large files should not be committed to the repository. '
            f'Use .gitignore or external storage (S3, R2) instead.\n'
            f'Override limit with: LARGE_FILE_GUARD_MAX_BYTES=<bytes>'
        ),
    }))


if __name__ == '__main__':
    main()
