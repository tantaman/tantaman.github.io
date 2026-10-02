export async function loadAttachmentBucket(): Promise<R2Bucket | null> {
  try {
    const specifier = "cloudflare:workers";
    const workers: typeof import("cloudflare:workers") = await import(/* @vite-ignore */ specifier);
    return workers.env.ATTACHMENTS_BUCKET;
  } catch {
    return null;
  }
}

export function localStorageEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function localAttachmentPath(storageKey: string): Promise<string | null> {
  if (!localStorageEnabled() || !/^authored\/(?:thoughts|pastes)\/[0-9A-HJKMNP-TV-Z]{26}$/.test(storageKey)) return null;
  const specifier = "node:path";
  const path = await import(/* @vite-ignore */ specifier) as typeof import("node:path");
  return path.join(process.cwd(), ".rindle", "attachments", ...storageKey.split("/"));
}
