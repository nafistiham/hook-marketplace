#!/usr/bin/env bash
# newline-eof-guard — PostToolUse hook for Claude Code
#
# Reads the Write tool event from stdin, extracts the file path,
# and appends a trailing newline if the file doesn't already end with one.
#
# Skips: binary files, files over 10 MB, and non-text files.
#
# Exit codes:
#   0 — always (this hook never blocks)

set -euo pipefail

# Read stdin into a variable
event=$(cat)

# Extract file_path using basic JSON parsing (no jq dependency)
file_path=$(printf '%s' "$event" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null || true)

# Nothing to do if no path
if [[ -z "$file_path" ]]; then
    exit 0
fi

# Skip if file doesn't exist
if [[ ! -f "$file_path" ]]; then
    exit 0
fi

# Skip files over 10 MB
file_size=$(wc -c < "$file_path" 2>/dev/null || echo 0)
if (( file_size > 10485760 )); then
    exit 0
fi

# Skip binary files (check with file command if available, else heuristic)
if command -v file &>/dev/null; then
    mime=$(file --brief --mime-type "$file_path" 2>/dev/null || echo "")
    if [[ "$mime" != text/* && "$mime" != "application/json" && "$mime" != "application/xml" ]]; then
        exit 0
    fi
fi

# Check if file ends with a newline
# If the last byte is not a newline, append one
last_byte=$(tail -c 1 "$file_path" | wc -c)
if (( last_byte == 0 )); then
    # Empty file — skip
    exit 0
fi

# Use od to check the last byte value
last_char=$(tail -c 1 "$file_path" | od -An -tu1 | tr -d ' \n')
if [[ "$last_char" != "10" ]]; then
    # Append a newline
    printf '\n' >> "$file_path"
fi

exit 0
