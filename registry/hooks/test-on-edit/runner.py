#!/usr/bin/env python3
"""
test-on-edit: Run tests automatically after source file edits.

Detects test runner from project files and runs it. Only triggers
on source files (not test files themselves, config, or lock files).
"""

import json
import os
import subprocess
import sys
from pathlib import Path

# File extensions that warrant running tests
SOURCE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts',
    '.py', '.go', '.rs', '.rb', '.java', '.cs', '.swift',
}

# Patterns to skip — changes to these don't need a test run
SKIP_PATTERNS = [
    'test', 'spec', '__tests__', '__mocks__',
    'node_modules', '.git', 'dist', 'build',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.md', '.json', '.toml', '.yaml', '.yml', '.env',
]


def should_run(file_path: str) -> bool:
    p = Path(file_path)
    if p.suffix not in SOURCE_EXTENSIONS:
        return False
    parts = p.parts
    for part in parts:
        for skip in SKIP_PATTERNS:
            if skip in part.lower():
                return False
    return True


def find_runner(cwd: Path) -> list[str] | None:
    """Detect the test runner from project files."""
    # Node.js / TypeScript
    pkg = cwd / 'package.json'
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text())
            scripts = data.get('scripts', {})
            test_script = scripts.get('test', '')
            if 'vitest' in test_script:
                return ['npx', 'vitest', 'run', '--reporter=verbose']
            if 'jest' in test_script:
                return ['npx', 'jest', '--passWithNoTests']
            if scripts.get('test'):
                return ['npm', 'test', '--', '--passWithNoTests']
        except (json.JSONDecodeError, OSError):
            pass

    # Python
    if (cwd / 'pytest.ini').exists() or (cwd / 'pyproject.toml').exists():
        return ['python3', '-m', 'pytest', '-q', '--tb=short']

    # Go
    if (cwd / 'go.mod').exists():
        return ['go', 'test', './...']

    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    file_path = tool_input.get('file_path', '')

    if not file_path or not should_run(file_path):
        sys.exit(0)

    # Run from the file's project root (walk up to find package.json / go.mod)
    start = Path(file_path).resolve().parent
    cwd = start
    for _ in range(6):
        if (cwd / 'package.json').exists() or (cwd / 'go.mod').exists() or (cwd / 'pyproject.toml').exists():
            break
        if cwd.parent == cwd:
            break
        cwd = cwd.parent

    runner = find_runner(cwd)
    if not runner:
        sys.exit(0)

    sys.stderr.write(f'\n▶ test-on-edit: running tests in {cwd}…\n')

    try:
        result = subprocess.run(
            runner,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            sys.stderr.write('✓ Tests passed\n')
        else:
            sys.stderr.write('✗ Tests failed:\n')
            sys.stderr.write(result.stdout[-2000:] if result.stdout else '')
            sys.stderr.write(result.stderr[-1000:] if result.stderr else '')
    except subprocess.TimeoutExpired:
        sys.stderr.write('⚠ test-on-edit: timed out after 120s\n')
    except FileNotFoundError:
        pass  # Runner not installed — skip silently


if __name__ == '__main__':
    main()
