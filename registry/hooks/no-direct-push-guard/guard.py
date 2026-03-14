#!/usr/bin/env python3
"""
no-direct-push-guard: Block direct git push to main or master.
"""

import json
import re
import sys

# Matches: git push [remote] main|master, git push --force origin main, etc.
# Also catches: git push origin HEAD:main
PROTECTED_BRANCHES = {'main', 'master'}

PUSH_RE = re.compile(r'\bgit\s+push\b', re.IGNORECASE)
BRANCH_RE = re.compile(r'\b(main|master)\b')
FORCE_RE = re.compile(r'--force|-f\b')


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    command = payload.get('tool_input', {}).get('command', '')

    if not command or not PUSH_RE.search(command):
        sys.exit(0)

    branch_match = BRANCH_RE.search(command)
    if not branch_match:
        sys.exit(0)

    branch = branch_match.group(1)
    is_force = bool(FORCE_RE.search(command))

    reason = (
        f'Direct push to \'{branch}\' is not allowed.\n'
        f'Push to a feature branch and open a pull request instead:\n'
        f'  git push origin HEAD:feature/your-feature-name\n'
        f'  gh pr create'
    )

    if is_force:
        reason = f'Force-pushing to \'{branch}\' is never allowed — this can destroy history.\n' + reason

    print(json.dumps({'decision': 'block', 'reason': reason}))
    sys.exit(0)


if __name__ == '__main__':
    main()
