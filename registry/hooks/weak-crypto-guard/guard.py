#!/usr/bin/env python3
"""
weak-crypto-guard: Block use of weak cryptographic algorithms in source files.

Detects MD5, SHA-1, DES, and RC4 usage across languages. Allows lines that
contain nosec annotations or the word 'checksum' (file integrity use cases).
Skips comment lines. Blocks with exact line numbers and algorithm names.
"""

import json
import re
import sys
from pathlib import Path

APPLICABLE_EXTENSIONS = {'.ts', '.js', '.jsx', '.tsx', '.py', '.go', '.java', '.rb', '.cs', '.php'}

WEAK_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\bmd5\s*\(', re.IGNORECASE), 'MD5'),
    (re.compile(r'hashlib\.md5\s*\('), 'MD5 (hashlib)'),
    (re.compile(r'MessageDigest\.getInstance\s*\(\s*["\']MD5["\']\s*\)'), 'MD5 (MessageDigest)'),
    (re.compile(r'\bsha1\s*\(', re.IGNORECASE), 'SHA-1'),
    (re.compile(r'hashlib\.sha1\s*\('), 'SHA-1 (hashlib)'),
    (re.compile(r'MessageDigest\.getInstance\s*\(\s*["\']SHA-1["\']\s*\)'), 'SHA-1 (MessageDigest)'),
    (re.compile(r'\bDES\s*\('), 'DES'),
    (re.compile(r'["\']DES["\']'), 'DES (string literal)'),
    (re.compile(r'Cipher\.getInstance\s*\(\s*["\']DES["\']\s*\)'), 'DES (Cipher)'),
    (re.compile(r'\bRC4\s*\('), 'RC4'),
    (re.compile(r'["\']RC4["\']'), 'RC4 (string literal)'),
]

NOSEC_MARKERS = ('# nosec', '// nosec', 'checksum')


def is_comment_line(line: str) -> bool:
    stripped = line.lstrip()
    return stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('*')


def has_nosec(line: str) -> bool:
    lower = line.lower()
    return any(marker in lower for marker in NOSEC_MARKERS)


def find_weak_crypto(content: str) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), 1):
        if is_comment_line(line):
            continue
        if has_nosec(line):
            continue
        for pattern, label in WEAK_PATTERNS:
            if pattern.search(line):
                findings.append((i, label))
                break
    return findings


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

    if p.suffix.lower() not in APPLICABLE_EXTENSIONS:
        sys.exit(0)

    findings = find_weak_crypto(content)
    if not findings:
        sys.exit(0)

    location = f' in {file_path}' if file_path else ''
    detail_lines = [f'  • line {lineno}: {label}' for lineno, label in findings]

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Found {len(findings)} weak cryptographic algorithm(s){location}:\n'
            + '\n'.join(detail_lines)
            + '\n\nMD5, SHA-1, DES, and RC4 are cryptographically broken. '
            'Use SHA-256 or stronger for hashing, AES-256-GCM for encryption. '
            'Add "# nosec" or "// nosec" to suppress false positives (e.g. file checksums).'
        ),
    }))


if __name__ == '__main__':
    main()
