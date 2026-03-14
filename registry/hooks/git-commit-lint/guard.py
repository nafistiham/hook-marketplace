#!/usr/bin/env python3
"""
git-commit-lint: Block git commits with non-conventional messages.

Only activates on 'git commit' commands. Extracts the -m message and
validates it against the Conventional Commits spec.
"""

import json
import re
import sys

# Conventional commits: type(scope): description
# type is required; (scope) is optional; description is required
CONVENTIONAL_RE = re.compile(
    r'^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|security|schema)'
    r'(\([^)]+\))?'
    r'!?'
    r': .+',
    re.IGNORECASE,
)

# Match git commit -m "..." or git commit -m '...' or heredoc forms
COMMIT_MSG_RE = re.compile(
    r'git\s+commit\b.*?(?:-m\s*["\']([^"\']+)["\']|EOF\n(.*?)\nEOF)',
    re.DOTALL,
)


def extract_message(command: str) -> str | None:
    """Extract commit message from a git commit command string."""
    # Simple -m "msg" or -m 'msg'
    m = re.search(r'-m\s+["\']([^"\']+)["\']', command)
    if m:
        return m.group(1).strip()
    # Heredoc: git commit -m "$(cat <<'EOF'\n...\nEOF\n)"
    m = re.search(r'cat\s+<<[\'"]?EOF[\'"]?\n(.*?)\nEOF', command, re.DOTALL)
    if m:
        return m.group(1).strip().split('\n')[0]  # first line is the subject
    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    command = tool_input.get('command', '')

    if not command or 'git' not in command or 'commit' not in command:
        sys.exit(0)

    # Skip --amend without -m (reuses previous message), skip --no-edit
    if '--no-edit' in command:
        sys.exit(0)

    msg = extract_message(command)
    if msg is None:
        sys.exit(0)  # Can't extract message — allow through

    # Ignore merge commits and revert commits (auto-generated)
    if msg.startswith(('Merge ', 'Revert "')):
        sys.exit(0)

    subject = msg.split('\n')[0]

    if CONVENTIONAL_RE.match(subject):
        sys.exit(0)

    print(json.dumps({
        'decision': 'block',
        'reason': (
            f'Commit message does not follow Conventional Commits format.\n'
            f'Got: "{subject}"\n'
            f'Expected: type(scope): description\n'
            f'Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, security, schema\n'
            f'Examples:\n'
            f'  feat(auth): add GitHub OAuth login\n'
            f'  fix(settings): handle corrupt lockfile gracefully\n'
            f'  chore: update dependencies'
        ),
    }))
    sys.exit(0)


if __name__ == '__main__':
    main()
