export const collections = ['', 'bookmarks/', 'notes/', 'the-mirror-room/', 'chats/', 'pages/'];

export function contentDirs(): string[] {
  return collections.map(c => './content/' + c);
}
