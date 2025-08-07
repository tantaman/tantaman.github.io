#!/bin/bash

# Generate combined content using shared script
./combine-content.sh
COMBINED_FILE=combined-content.md

pandoc --from markdown \
  --to pdf \
  -s \
  --toc \
  --toc-depth=2 \
  --lua-filter ../pagebreak.lua \
  -o book.pdf \
  --defaults=defaults.yml \
  --metadata-file=metadata.yml \
  -V geometry:"paperwidth=5in,paperheight=8in,top=0.5in,bottom=0.5in,inner=0.5in,outer=0.5in" \
  -B copyright.md \
  $COMBINED_FILE

# Clean up
# rm -f $COMBINED_FILE
