#!/usr/bin/env python3
"""
env-leak-guard: Block bash commands that reference secret-like env vars.

Reads the PreToolUse hook payload from stdin and exits non-zero with a
blocking message if the command references patterns that look like credentials.
"""

import json
import re
import sys

SECRET_PATTERNS = [
    r'\$(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|AUTH_KEY|CLIENT_SECRET|DB_PASS|DATABASE_PASSWORD)',
    r'\$\{(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|AUTH_KEY|CLIENT_SECRET|DB_PASS|DATABASE_PASSWORD)\}',
]

COMPILED = [re.compile(p, re.IGNORECASE) for p in SECRET_PATTERNS]


def check(command: str) -> list[str]:
    matches = []
    for pattern in COMPILED:
        for m in pattern.finditer(command):
            matches.append(m.group(0))
    return matches


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)  # Can't parse — allow through

    tool_input = payload.get('tool_input', {})
    command = tool_input.get('command', '')

    if not command:
        sys.exit(0)

    found = check(command)
    if not found:
        sys.exit(0)

    unique = list(dict.fromkeys(found))  # deduplicate, preserve order
    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Command references secret-like variable(s): {", ".join(unique)}. '
            'Passing secrets as shell arguments can leak them into process listings and shell history. '
            'Use a secrets manager or pass via stdin instead.'
        ),
    }))
    sys.exit(0)


if __name__ == '__main__':
    main()
