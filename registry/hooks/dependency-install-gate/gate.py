#!/usr/bin/env python3
"""
dependency-install-gate — PreToolUse hook for Claude Code
Intercepts package install commands and blocks packages not on the allow-list.

Supports: npm install, npm i, yarn add, pnpm add, pip install, pip3 install,
          poetry add, cargo add, go get, gem install, composer require

Configuration:
  INSTALL_GATE_ALLOW=1                  — bypass the gate entirely (use with caution)
  INSTALL_GATE_ALLOWLIST_FILE=<path>    — path to a plaintext file of allowed packages,
                                          one per line. If not set, ALL installs are blocked.

Exit codes:
  0 — command is safe (no install detected, or all packages are allowed)
  2 — blocked (unapproved package; message on stderr)
"""
import json
import os
import re
import sys

# Regex patterns to detect install commands and extract package names
INSTALL_PATTERNS = [
    # npm install <pkg> / npm i <pkg>
    (r"\bnpm\s+(install|i)\s+(?!--)([^\s;|&<>]+)", "npm"),
    # yarn add <pkg>
    (r"\byarn\s+add\s+(?!--)([^\s;|&<>]+)", "yarn"),
    # pnpm add <pkg>
    (r"\bpnpm\s+add\s+(?!--)([^\s;|&<>]+)", "pnpm"),
    # pip install <pkg> / pip3 install <pkg>
    (r"\bpip3?\s+install\s+(?!--)([^\s;|&<>]+)", "pip"),
    # poetry add <pkg>
    (r"\bpoetry\s+add\s+(?!--)([^\s;|&<>]+)", "poetry"),
    # cargo add <pkg>
    (r"\bcargo\s+add\s+([^\s;|&<>]+)", "cargo"),
    # go get <pkg>
    (r"\bgo\s+get\s+([^\s;|&<>]+)", "go"),
    # gem install <pkg>
    (r"\bgem\s+install\s+([^\s;|&<>]+)", "gem"),
    # composer require <pkg>
    (r"\bcomposer\s+require\s+([^\s;|&<>]+)", "composer"),
]

# Flags that indicate an operation on existing packages (not adding new ones)
SAFE_FLAG_PATTERN = re.compile(
    r"\b(--frozen-lockfile|--immutable|--no-save|--save-dev|-D|-g|--global)\b"
)


def load_allowlist(path: str) -> set[str]:
    """Load allowed package names from a file, one per line."""
    try:
        with open(path, "r") as f:
            return {
                line.strip().lower()
                for line in f
                if line.strip() and not line.startswith("#")
            }
    except OSError as exc:
        sys.stderr.write(f"dependency-install-gate: cannot read allowlist {path}: {exc}\n")
        return set()


def extract_package_name(raw: str) -> str:
    """Normalise a package token: strip version specifiers and scope."""
    # Strip version: pkg@1.2.3, pkg==1.0, pkg>=2
    pkg = re.sub(r"(@[^/].*|[=<>!~^].*)$", "", raw)
    return pkg.lower().strip()


def find_installs(command: str) -> list[tuple[str, str]]:
    """Return list of (package_name, manager) for each install detected."""
    results = []
    for pattern, manager in INSTALL_PATTERNS:
        for match in re.finditer(pattern, command, re.IGNORECASE):
            # Group index depends on pattern structure
            groups = [g for g in match.groups() if g is not None]
            raw_pkg = groups[-1]
            if raw_pkg.startswith("-"):
                continue  # It's a flag, not a package
            pkg = extract_package_name(raw_pkg)
            if pkg:
                results.append((pkg, manager))
    return results


def main() -> None:
    # Bypass via env var
    if os.environ.get("INSTALL_GATE_ALLOW", "").strip() in ("1", "true", "yes"):
        sys.exit(0)

    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"dependency-install-gate: invalid JSON input: {exc}\n")
        sys.exit(0)

    command = event.get("tool_input", {}).get("command", "")
    if not command:
        sys.exit(0)

    # If it's only operating on locked/existing deps, allow it
    if SAFE_FLAG_PATTERN.search(command):
        sys.exit(0)

    installs = find_installs(command)
    if not installs:
        sys.exit(0)  # No install command detected

    # Load allowlist
    allowlist_file = os.environ.get("INSTALL_GATE_ALLOWLIST_FILE", "").strip()
    if allowlist_file:
        allowed = load_allowlist(allowlist_file)
    else:
        allowed = set()  # Empty = block everything not explicitly allowed

    blocked = [(pkg, mgr) for pkg, mgr in installs if pkg not in allowed]
    if not blocked:
        sys.exit(0)

    pkg_list = "\n".join(f"  • {pkg} (via {mgr})" for pkg, mgr in blocked)
    sys.stderr.write(
        f"dependency-install-gate: blocked — unapproved package install(s)\n"
        f"{pkg_list}\n"
        f"\n"
        f"  To allow these packages, add them to your allowlist file and set:\n"
        f"    export INSTALL_GATE_ALLOWLIST_FILE=/path/to/allowed-packages.txt\n"
        f"\n"
        f"  To bypass the gate entirely for this session (use with caution):\n"
        f"    export INSTALL_GATE_ALLOW=1\n"
    )
    sys.exit(2)


if __name__ == "__main__":
    main()
