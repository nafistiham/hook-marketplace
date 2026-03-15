#!/usr/bin/env python3
"""
xml-syntax-guard: Validate XML/SVG/XHTML syntax before writing.

Uses Python's built-in xml.etree.ElementTree to parse content and blocks
if a parse error is detected. Also runs on content that starts with <?xml
or <svg even when the file_path is absent. Pure stdlib — no external
dependencies.
"""

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

XML_EXTENSIONS = {'.xml', '.svg', '.xhtml'}


def looks_like_xml(content: str) -> bool:
    stripped = content.lstrip()
    return stripped.startswith('<?xml') or stripped.startswith('<svg')


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = payload.get('tool_input', {})
    content = tool_input.get('content', '') or tool_input.get('new_string', '')
    file_path = tool_input.get('file_path', '')

    if not content:
        sys.exit(0)

    p = Path(file_path) if file_path else None
    has_xml_extension = p is not None and p.suffix.lower() in XML_EXTENSIONS

    if not has_xml_extension and not looks_like_xml(content):
        sys.exit(0)

    try:
        ET.fromstring(content)
    except ET.ParseError as exc:
        location = f' in {file_path}' if file_path else ''
        print(json.dumps({
            'decision': 'block',
            'reason': (
                f'XML syntax error{location}:\n'
                f'  {exc}\n\n'
                'Fix the XML syntax error before saving.'
            ),
        }))


if __name__ == '__main__':
    main()
