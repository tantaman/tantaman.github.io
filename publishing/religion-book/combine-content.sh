#!/bin/bash

# Combine religion book markdown files for publishing
# Usage: ./combine-content.sh [output_file]

BASE_PATH=../../_drafts/religion-book
COMBINED_FILE=${1:-combined-content.md}

# Remove existing combined file if it exists
rm -f $COMBINED_FILE

for file in \
  "$BASE_PATH/00-preface.md" \
  "$BASE_PATH/chapter-01-know-thyself.md" \
  "$BASE_PATH/chapter-02-gods-persistence.md" \
  "$BASE_PATH/chapter-03-pathologies-of-secularism.md" \
  "$BASE_PATH/chapter-04-secularisms-analysis-of-power.md" \
  "$BASE_PATH/chapter-05-physicians-of-decay.md" \
  "$BASE_PATH/chapter-06-the-wheel.md" \
  "$BASE_PATH/chapter-07-first-encounter.md" \
  "$BASE_PATH/chapter-08-stepping-off.md" \
  "$BASE_PATH/chapter-09-mysticism-pulls.md" \
  "$BASE_PATH/chapter-10-what-counts-as-knowing.md" \
  "$BASE_PATH/chapter-11-rupture.md" \
  "$BASE_PATH/chapter-12-architecture-complete.md" \
  "$BASE_PATH/chapter-13-arrival.md"
do
  cat "$file" >> $COMBINED_FILE
  echo "" >> $COMBINED_FILE
  echo "\\newpage" >> $COMBINED_FILE
done

echo "Content combined into $COMBINED_FILE"
