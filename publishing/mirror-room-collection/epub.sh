BASE_PATH=../../content/the-mirror-room
COMBINED_FILE=combined-content.md

# Remove existing combined file if it exists
rm -f $COMBINED_FILE

# Combine all markdown files, stripping frontmatter
for file in \
  "$BASE_PATH/01-the-consistent-man.md" \
  "$BASE_PATH/02-the-mirror-room.md" \
  "$BASE_PATH/03-the-meeting.md" \
  "$BASE_PATH/04-the-paradox-of-becoming.md" \
  "$BASE_PATH/05-the-readers-crisis.md" \
  "$BASE_PATH/06-gurdjieff-observations.md"
do
  # Skip frontmatter (everything between first --- and second ---)
  # Then append the content to combined file
  awk '
    BEGIN { in_frontmatter = 0; frontmatter_ended = 0 }
    /^---$/ { 
      if (!frontmatter_ended) {
        in_frontmatter = !in_frontmatter
        if (!in_frontmatter) frontmatter_ended = 1
        next
      }
    }
    !in_frontmatter && frontmatter_ended { print }
  ' "$file" >> $COMBINED_FILE
  
  # Add a page break between files
  echo "\n\n" >> $COMBINED_FILE
done

pandoc --from markdown \
  --to epub3 \
  --lua-filter ../pagebreak.lua \
  -o book.epub \
  --defaults=defaults.yml \
  --metadata-file=metadata.yml \
  --epub-embed-font="CormorantGaramond-Italic-VariableFont_wght.ttf" \
  --epub-embed-font="CormorantGaramond-VariableFont_wght.ttf" \
  start.md \
  $COMBINED_FILE

# Clean up
rm -f $COMBINED_FILE
