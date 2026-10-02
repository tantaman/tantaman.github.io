INSERT INTO pasteFile (id, fileName, mediaType, size, createdAt, state)
SELECT storageKey, MAX(fileName), MAX(mediaType), MAX(size), MIN(createdAt), 'active'
FROM pasteAttachment GROUP BY storageKey;
