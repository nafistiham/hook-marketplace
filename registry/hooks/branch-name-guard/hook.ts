/**
 * branch-name-guard — PreToolUse hook for Claude Code (TypeScript source)
 *
 * Intercepts `git checkout -b` and `git switch -c` commands and blocks branch
 * names that don't follow a conventional pattern.
 *
 * Default allowed prefixes: feature/, bug/, fix/, hotfix/, docs/, chore/,
 *                            test/, security/, refactor/, perf/, ci/
 *
 * Configuration via environment variable:
 *   BRANCH_NAME_PATTERN — a custom JS regex string (without slashes), e.g.
 *                         "^(feat|fix|chore)\/.+"
 *
 * Exit codes:
 *   0 — allow (no branch creation detected, or name matches pattern)
 *   2 — block (branch name violates convention)
 *
 * Compiled to hook.js — run with: node hook.js
 */

import { createInterface } from "node:readline";

interface HookEvent {
  tool_name?: string;
  tool_input?: {
    command?: string;
  };
}

const DEFAULT_PATTERN =
  /^(feature|bug|fix|hotfix|docs|chore|test|security|refactor|perf|ci)\/.+/;

// Matches: git checkout -b <name>, git switch -c <name>
const BRANCH_CREATE_RE =
  /\bgit\s+(?:checkout\s+-b|switch\s+-c)\s+(['"]?)(\S+)\1/;

function extractBranchName(command: string): string | null {
  const match = BRANCH_CREATE_RE.exec(command);
  return match ? match[2] : null;
}

function getBranchPattern(): RegExp {
  const envPattern = process.env["BRANCH_NAME_PATTERN"];
  if (envPattern) {
    try {
      return new RegExp(envPattern);
    } catch {
      process.stderr.write(
        `branch-name-guard: invalid BRANCH_NAME_PATTERN — falling back to default\n`
      );
    }
  }
  return DEFAULT_PATTERN;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => lines.push(line));
    rl.on("close", () => resolve(lines.join("\n")));
  });
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await readStdin();
  } catch {
    process.exit(0); // fail open
  }

  let event: HookEvent;
  try {
    event = JSON.parse(raw) as HookEvent;
  } catch {
    process.exit(0); // fail open — don't block on parse error
  }

  const command = event.tool_input?.command ?? "";
  if (!command) process.exit(0);

  const branchName = extractBranchName(command);
  if (!branchName) process.exit(0); // not a branch creation command

  const pattern = getBranchPattern();
  if (pattern.test(branchName)) process.exit(0); // name is valid

  const allowedPrefixes = [
    "feature/",
    "bug/",
    "fix/",
    "hotfix/",
    "docs/",
    "chore/",
    "test/",
    "security/",
    "refactor/",
    "perf/",
    "ci/",
  ];

  process.stderr.write(
    `branch-name-guard: blocked — branch name does not follow conventions\n` +
      `  Branch: ${branchName}\n` +
      `\n` +
      `  Allowed prefixes: ${allowedPrefixes.join(", ")}\n` +
      `  Examples: feature/user-auth, fix/login-crash, chore/update-deps\n` +
      `\n` +
      `  To use a custom pattern: export BRANCH_NAME_PATTERN="^your-regex"\n`
  );
  process.exit(2);
}

main().catch(() => process.exit(0)); // always fail open on unexpected errors
