#!/usr/bin/env python3
"""
sensitive-file-guard: Block writes to sensitive credential files.
"""

import json
import os
import re
import sys
from pathlib import Path

# Exact filenames that are always sensitive
SENSITIVE_NAMES = {
    '.env', '.env.local', '.env.production', '.env.staging',
    '.env.development', '.envrc',
    'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa',
    'credentials', 'credentials.json',
    '.netrc', '.htpasswd',
    'secrets.json', 'secrets.yaml', 'secrets.yml',
    'serviceAccountKey.json',
}

# Suffix patterns that are always sensitive
SENSITIVE_SUFFIXES = {
    '.pem', '.key', '.p12', '.pfx', '.pkcs12',
    '.cer', '.crt',
}

# Regex patterns for paths that look sensitive
SENSITIVE_PATH_RE = re.compile(
    r'(secret|credential|private.?key|auth.?token|api.?key)',
    re.IGNORECASE,
)


def is_sensitive(file_path: str) -> str | None:
    """Returns a reason string if the file is sensitive, else None."""
    p = Path(file_path)
    name = p.name.lower()
    suffix = p.suffix.lower()

    if name in SENSITIVE_NAMES:
        return f"'{p.name}' is a sensitive credential file"

    if suffix in SENSITIVE_SUFFIXES:
        return f"'.{suffix}' files contain cryptographic keys or certificates"

    if SENSITIVE_PATH_RE.search(str(p)):
        return f"Path '{file_path}' matches a sensitive credential pattern"

    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = payload.get('tool_input', {}).get('file_path', '')
    if not file_path:
        sys.exit(0)

    reason = is_sensitive(file_path)
    if not reason:
        sys.exit(0)

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Blocked write to sensitive file: {reason}.\n'
            f'Path: {file_path}\n'
            f'If you intentionally need to edit this file, do it manually outside of Claude.'
        ),
    }))


if __name__ == '__main__':
    main()
