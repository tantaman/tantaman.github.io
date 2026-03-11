#!/bin/bash

# Combine self-cage-wheel-ground markdown files for publishing
# Iterates movement directories and collects non-underscore .md files
# Usage: ./combine-content.sh [output_file]

BASE_PATH=../../_drafts/self-cage-wheel-ground
COMBINED_FILE=${1:-combined-content.md}

# Remove existing combined file if it exists
rm -f $COMBINED_FILE

FIRST=true

for movement_dir in "$BASE_PATH"/0[1-4]-*/; do
  [ -d "$movement_dir" ] || continue

  for chapter in $(find "$movement_dir" -maxdepth 1 -name '*.md' ! -name '_*' | sort); do
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      printf '\n\n\\newpage\n\n' >> $COMBINED_FILE
    fi
    cat "$chapter" >> $COMBINED_FILE
  done
done

echo "Content combined into $COMBINED_FILE"
