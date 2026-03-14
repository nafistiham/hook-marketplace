#!/usr/bin/env python3
"""
secret-scan-guard: Block writes that contain hardcoded secrets.

Uses gitleaks if installed. Falls back to built-in regex patterns
covering the most common credential formats.
"""

import json
import re
import subprocess
import sys
import tempfile
import os
from pathlib import Path

# ─── Built-in secret patterns ─────────────────────────────────────────────────
# Each entry: (name, compiled_regex)

PATTERNS: list[tuple[str, re.Pattern]] = [
    ('AWS Access Key ID',        re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ('AWS Secret Access Key',    re.compile(r'(?i)aws.{0,20}secret.{0,20}["\'][0-9a-zA-Z/+]{40}["\']')),
    ('GitHub Personal Token',    re.compile(r'\bghp_[0-9a-zA-Z]{36}\b')),
    ('GitHub OAuth Token',       re.compile(r'\bgho_[0-9a-zA-Z]{36}\b')),
    ('GitHub App Token',         re.compile(r'\bghs_[0-9a-zA-Z]{36}\b')),
    ('Stripe Live Secret Key',   re.compile(r'\bsk_live_[0-9a-zA-Z]{24,}\b')),
    ('Stripe Test Secret Key',   re.compile(r'\bsk_test_[0-9a-zA-Z]{24,}\b')),
    ('Slack Bot Token',          re.compile(r'\bxoxb-[0-9]{10,}-[0-9]{10,}-[0-9a-zA-Z]{24}\b')),
    ('Slack User Token',         re.compile(r'\bxoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[0-9a-fA-F]{32}\b')),
    ('Twilio Account SID',       re.compile(r'\bAC[0-9a-fA-F]{32}\b')),
    ('SendGrid API Key',         re.compile(r'\bSG\.[0-9a-zA-Z\-_]{22}\.[0-9a-zA-Z\-_]{43}\b')),
    ('Cloudflare API Token',     re.compile(r'\b[0-9a-zA-Z_-]{40}\b')),  # broad — gitleaks handles better
    ('Private Key Block',        re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY')),
    ('Generic Password Assign',  re.compile(r'(?i)(?:password|passwd|pwd)\s*=\s*["\'][^"\']{8,}["\']')),
    ('Generic Secret Assign',    re.compile(r'(?i)(?:secret|api_key|apikey|auth_token|access_token)\s*=\s*["\'][^"\']{8,}["\']')),
]

# Skip these file types — false positives or binary
SKIP_EXTENSIONS = {'.lock', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'}

# Skip test fixture files — they often contain fake credentials intentionally
SKIP_PATH_PATTERNS = ['fixture', 'mock', '__tests__', 'test_data', '.example']


def should_skip(file_path: str, content: str) -> bool:
    p = Path(file_path) if file_path else None
    if p and p.suffix.lower() in SKIP_EXTENSIONS:
        return True
    path_lower = file_path.lower()
    for pat in SKIP_PATH_PATTERNS:
        if pat in path_lower:
            return True
    # Skip if content is clearly example/placeholder values
    if 'your-api-key' in content.lower() or 'xxxxxxxxxxxx' in content.lower():
        return True
    return False


def scan_with_gitleaks(content: str, file_path: str) -> list[str]:
    """Try gitleaks scan. Returns list of finding descriptions or empty list."""
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix=Path(file_path).suffix or '.txt',
            delete=False, encoding='utf-8'
        ) as f:
            f.write(content)
            tmp = f.name

        result = subprocess.run(
            ['gitleaks', 'detect', '--source', tmp, '--no-git', '--report-format', 'json', '-q'],
            capture_output=True, text=True, timeout=10,
        )
        os.unlink(tmp)

        if result.returncode == 0:
            return []  # Clean

        try:
            findings = json.loads(result.stdout)
            return [f"{f.get('RuleID', 'secret')} at line {f.get('StartLine', '?')}" for f in findings[:5]]
        except (json.JSONDecodeError, TypeError):
            return ['secret detected (see gitleaks output)']

    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return []  # gitleaks not available


def scan_with_regex(content: str) -> list[str]:
    """Fallback regex scan. Returns list of finding descriptions."""
    findings = []
    for name, pattern in PATTERNS:
        if pattern.search(content):
            # Skip the broad Cloudflare pattern in regex mode — too many false positives
            if name == 'Cloudflare API Token':
                continue
            findings.append(name)
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

    if should_skip(file_path, content):
        sys.exit(0)

    # Try gitleaks first
    findings = scan_with_gitleaks(content, file_path)

    # Fall back to built-in patterns
    if not findings:
        findings = scan_with_regex(content)

    if not findings:
        sys.exit(0)

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Hardcoded secret(s) detected in {file_path or "content"}:\n'
            + '\n'.join(f'  • {f}' for f in findings)
            + '\n\nNever commit credentials to source code. Use environment variables '
            'or a secrets manager instead.\n'
            'If this is a false positive, store example values with obvious placeholders '
            'like "your-api-key-here".'
        ),
    }))


if __name__ == '__main__':
    main()
