export interface ImportedAttachment {
  id: string;
  pasteId: string;
  storageKey: string;
  mediaType: string;
  fileName: string;
  size: number;
  createdAt: number;
  position: number;
}
export function normalizeAttachments(rows: unknown[]): ImportedAttachment[];
export function attachmentImportStatements(row: ImportedAttachment): { sql: string; args: (string | number)[] }[];
