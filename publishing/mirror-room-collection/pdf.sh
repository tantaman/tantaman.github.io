#!/bin/bash

# Generate combined content using shared script
./combine-content.sh
COMBINED_FILE=combined-content.md

pandoc --from markdown \
  --to pdf \
  -s \
  --lua-filter ../pagebreak.lua \
  -o book.pdf \
  --defaults=defaults.yml \
  --metadata-file=metadata.yml \
  -V geometry:"paperwidth=6in,paperheight=9in,margin=0.75in" \
  start.md \
  $COMBINED_FILE

# Clean up
# rm -f $COMBINED_FILE
