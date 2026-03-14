#!/usr/bin/env python3
"""
token-usage-logger: Append token usage stats to ~/.hookpm/token-log.jsonl

Triggered by the Stop event. Reads usage data from the hook payload and
appends a JSON line to the log file for later analysis.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    usage = payload.get('usage', {})
    if not usage:
        sys.exit(0)

    log_dir = Path(os.environ.get('HOOKPM_DIR', Path.home() / '.hookpm'))
    log_path = log_dir / 'token-log.jsonl'

    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        sys.exit(0)

    entry = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'input_tokens': usage.get('input_tokens', 0),
        'output_tokens': usage.get('output_tokens', 0),
        'cache_read_tokens': usage.get('cache_read_input_tokens', 0),
        'cache_write_tokens': usage.get('cache_creation_input_tokens', 0),
        'session_id': payload.get('session_id', ''),
    }

    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry) + '\n')
    except OSError:
        pass  # Non-fatal — logging must not affect session teardown


if __name__ == '__main__':
    main()
