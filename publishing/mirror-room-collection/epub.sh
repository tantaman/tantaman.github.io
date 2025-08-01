BASE_PATH=../../content/the-mirror-room
pandoc --metadata-file=./metadata.yml \
  --from markdown \
  --to epub3 \
  -o book.epub \
  --epub-embed-font="CormorantGaramond-Italic-VariableFont_wght.ttf" \
  --epub-embed-font="CormorantGaramond-VariableFont_wght.ttf" \
  $BASE_PATH/01-the-consistent-man.md \
  $BASE_PATH/02-the-mirror-room.md \
  $BASE_PATH/03-the-meeting.md \
  $BASE_PATH/04-the-paradox-of-becoming.md \
  $BASE_PATH/05-the-readers-crisis.md \
  $BASE_PATH/06-gurdjieff-observations.md
