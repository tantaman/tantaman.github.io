#!/bin/bash
set -euo pipefail

# Assemble the book in chapters.txt order. Run from any working directory.
# Usage: ./combine-content.sh [output_file]
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
python3 - "$SCRIPT_DIR" "${1:-$SCRIPT_DIR/combined-content.md}" <<'PY'
import os
from pathlib import Path
import re
import sys
import tempfile

publishing = Path(sys.argv[1])
book = publishing.parent.parent / '_drafts/self-cage-wheel-ground'
output = Path(sys.argv[2]).resolve()
manifest = book / 'chapters.txt'
entries = [line.strip() for line in manifest.read_text().splitlines()
           if line.strip() and not line.startswith('#')]
sources = [(book / entry).resolve() for entry in entries]
if len(sources) != len(set(sources)):
    raise SystemExit('Duplicate entry in chapters.txt')
if output in sources or output == manifest.resolve():
    raise SystemExit('Output must not overwrite a manuscript source')

movements = {
    '01-self': 'Movement One: Self',
    '02-cage': 'Movement Two: Cage',
    '03-wheel': 'Movement Three: Wheel',
    '04-ground': 'Movement Four: Ground',
}
parts = ['# The Self, The Cage, The Wheel, The Ground\n\nMatthew Wonlaw\n\n2026\n']
seen = set()
word_count = 0

for source in sources:
    if not source.is_relative_to(book.resolve()) or not source.is_file():
        raise SystemExit(f'Missing or invalid chapter: {source}')
    body = source.read_text().strip()
    if not body.startswith('# '):
        raise SystemExit(f'Chapter must begin with a title: {source}')
    word_count += len(body.split())
    movement = source.parent.name
    if movement in movements and movement not in seen:
        parts.append('# ' + movements[movement])
        seen.add(movement)

    # Keep relative source links usable in an output placed anywhere.
    def relink(match):
        target = match.group(1)
        if not target.startswith(('./', '../')):
            return match.group(0)
        path, marker, anchor = target.partition('#')
        linked = (source.parent / path).resolve()
        if not linked.exists():
            raise SystemExit(f'Broken source link in {source}: {target}')
        relative = Path(os.path.relpath(linked, output.parent)).as_posix()
        return '](' + relative + (marker + anchor if marker else '') + ')'

    parts.append(re.sub(r'\]\(([^\s)]+)\)', relink, body))

if seen != set(movements):
    raise SystemExit('The manifest must include all four movements')
text = '\n\n\\newpage\n\n'.join(parts) + '\n'
refs = set(re.findall(r'\[\^([^\]]+)\](?!:)', text))
definitions = re.findall(r'^\[\^([^\]]+)\]:', text, re.MULTILINE)
if refs != set(definitions) or len(definitions) != len(set(definitions)):
    raise SystemExit('Missing, unused, or duplicate footnote definitions')
output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.NamedTemporaryFile(mode='w', dir=output.parent, delete=False) as temp:
    temp.write(text)
    temporary = Path(temp.name)
try:
    temporary.chmod(0o644)
    os.replace(temporary, output)
finally:
    temporary.unlink(missing_ok=True)
print(f'Assembled {len(sources)} sections, {word_count:,} words: {output}')
PY
