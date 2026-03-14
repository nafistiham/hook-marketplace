#!/usr/bin/env python3
"""
port-scan-guard: Block network scanning and recon tools.
"""

import json
import re
import sys

# Tools that are exclusively or primarily used for network scanning
SCAN_TOOLS = [
    r'\bnmap\b',
    r'\bmasscan\b',
    r'\bzmap\b',
    r'\bunicornscan\b',
    r'\bangry.?ip.?scanner\b',
    r'\bametrine\b',
    r'\brustscan\b',
]

# netcat in scan mode: nc -z (port scan flag)
NETCAT_SCAN_RE = re.compile(r'\bnc\b.*-z\b|\bncat\b.*-z\b', re.IGNORECASE)

# Combine all scan patterns
SCAN_RE = re.compile('|'.join(SCAN_TOOLS), re.IGNORECASE)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    command = payload.get('tool_input', {}).get('command', '')
    if not command:
        sys.exit(0)

    match = SCAN_RE.search(command)
    tool = match.group(0).strip() if match else None

    if not tool and not NETCAT_SCAN_RE.search(command):
        sys.exit(0)

    tool = tool or 'nc -z (port scan)'

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Network scanning tool detected: {tool}\n'
            f'Running port scans or network reconnaissance without explicit authorization '
            f'may be illegal and violates most terms of service.\n'
            f'If you need to check a specific port, use: nc -w1 <host> <port>'
        ),
    }))


if __name__ == '__main__':
    main()
