// Loaded only by the ordinary Node development server.
import { mkdir, open, link, unlink } from "node:fs/promises";
import { dirname } from "node:path";

/** An interrupted or invalid stream never exposes a partial file under its final key. */
export async function putLocalAttachment(file: string, body: ReadableStream<Uint8Array>): Promise<void> {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  const reader = body.getReader();
  try {
    await mkdir(dirname(file), { recursive: true });
    const handle = await open(temporary, "wx");
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        await handle.writeFile(value);
      }
    } finally {
      await handle.close();
    }
    try {
      await link(temporary, file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
