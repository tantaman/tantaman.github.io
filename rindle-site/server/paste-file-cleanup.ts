import type { ServerSql } from "@rindle/api-server";
import { loadAttachmentBucket, localAttachmentPath } from "./attachment-storage.ts";

/** Retired keys cannot gain new references. Failed deletions stay queued for the next mutation. */
export async function cleanupPasteFiles(sql: ServerSql): Promise<void> {
  try {
    const rows = await sql.query<{ id: string }>(
      `SELECT id FROM pasteFile WHERE state = 'deleted' ORDER BY id LIMIT 100`,
    );
    if (!rows.length) return;
    const bucket = await loadAttachmentBucket();
    for (const { id } of rows) {
      if (bucket) {
        await bucket.delete(id);
      } else {
        const file = await localAttachmentPath(id);
        if (!file) continue;
        const specifier = "node:fs/promises";
        const fs = await import(/* @vite-ignore */ specifier) as typeof import("node:fs/promises");
        await fs.unlink(file).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
      await sql.execute(`UPDATE pasteFile SET state = 'cleaned' WHERE id = ? AND state = 'deleted'`, [id]);
    }
  } catch (error) {
    // The mutation is already committed. Cleanup failure must not reject an accepted write.
    console.error(JSON.stringify({ message: "paste file cleanup deferred", error: String(error) }));
  }
}
