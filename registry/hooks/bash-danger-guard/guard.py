#!/usr/bin/env python3
"""
bash-danger-guard — PreToolUse hook for Claude Code
Intercepts Bash tool calls and blocks high-risk shell patterns.

Exit codes:
  0 — allow the command (no dangerous patterns found)
  2 — block the command (dangerous pattern detected; message on stderr)
"""
import json
import re
import sys

# Patterns that indicate dangerous or irreversible operations
DANGEROUS_PATTERNS = [
    (r'\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?-r', "recursive rm (rm -rf / rm -r)"),
    (r'\brm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)?-f', "force rm (rm -f / rm -fr)"),
    (r'\bchmod\s+777\b', "chmod 777 (world-writable permissions)"),
    (r'\bcurl\b.*\|\s*(ba)?sh\b', "curl | sh (remote code execution)"),
    (r'\bwget\b.*\|\s*(ba)?sh\b', "wget | sh (remote code execution)"),
    (r'\b(dd|mkfs)\b', "destructive disk operation (dd / mkfs)"),
    (r'\bsudo\s+rm\b', "sudo rm"),
    (r'>\s*/dev/(s?d[a-z]|nvme)', "raw device write"),
    (r'\bfork\s*bomb\b|:\s*\(\s*\)\s*\{', "fork bomb pattern"),
]


def check_command(command: str) -> list[str]:
    """Return list of (description) for each dangerous pattern found."""
    findings = []
    for pattern, description in DANGEROUS_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            findings.append(description)
    return findings


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"bash-danger-guard: invalid JSON input: {exc}\n")
        sys.exit(0)  # Fail open — don't block on our own parse error

    tool_input = event.get("tool_input", {})
    command = tool_input.get("command", "")

    if not command:
        sys.exit(0)  # Nothing to check

    findings = check_command(command)
    if not findings:
        sys.exit(0)  # Safe

    bullet_list = "\n".join(f"  • {f}" for f in findings)
    sys.stderr.write(
        f"bash-danger-guard: blocked — dangerous pattern(s) detected:\n{bullet_list}\n"
        f"\nCommand was: {command!r}\n"
        f"If you intended this, run hookpm remove bash-danger-guard to disable the guard.\n"
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
