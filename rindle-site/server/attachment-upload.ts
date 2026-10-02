// Upload validation keeps only a 40-byte signature prefix plus the current network chunk.
export class AttachmentUploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AttachmentUploadError";
    this.status = status;
  }
}

export function attachmentUploadLength(headers: Headers, maxBytes: number): number {
  const declared = headers.get("X-File-Size") ?? headers.get("Content-Length");
  if (declared === null) throw new AttachmentUploadError("File size is required", 411);
  const length = Number(declared);
  if (!/^\d+$/.test(declared) || !Number.isSafeInteger(length) || length < 1) {
    throw new AttachmentUploadError("Invalid file size", 400);
  }
  if (length > maxBytes) throw new AttachmentUploadError(`Files must be ${maxBytes / (1024 * 1024)} MB or smaller`, 413);
  const transportLength = headers.get("Content-Length");
  if (transportLength !== null && Number(transportLength) !== length) {
    throw new AttachmentUploadError("File size does not match Content-Length", 400);
  }
  return length;
}

function inlineSignatureMatches(mediaType: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (mediaType === "video/mp4") return ascii(4, 4) === "ftyp";
  if (mediaType === "video/webm") {
    return [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value);
  }
  if (mediaType === "video/ogg") return ascii(0, 4) === "OggS";
  if (mediaType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mediaType === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (mediaType === "image/gif") return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
  if (mediaType === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (mediaType === "image/avif") {
    if (ascii(4, 4) !== "ftyp") return false;
    const brands = ascii(8, Math.min(32, Math.max(0, bytes.length - 8)));
    return brands.includes("avif") || brands.includes("avis");
  }
  return false;
}

/** Validation is driven by the storage consumer's reads, preserving backpressure. */
export function validatedAttachmentStream(
  body: ReadableStream<Uint8Array>,
  mediaType: string,
  expectedLength: number,
  maxBytes: number,
  checkSignature: boolean,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const prefix = new Uint8Array(40);
  let prefixLength = 0;
  let received = 0;
  let checked = !checkSignature;
  let cancelled = false;
  let released = false;

  function releaseReader() {
    if (!released) { reader.releaseLock(); released = true; }
  }

  function validateSignature() {
    if (!inlineSignatureMatches(mediaType, prefix.subarray(0, prefixLength))) {
      throw new AttachmentUploadError("The file contents do not match its media type", 415);
    }
    checked = true;
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (cancelled) return;
          if (done) {
            if (received !== expectedLength) {
              throw new AttachmentUploadError("File size does not match the uploaded bytes", 400);
            }
            if (!checked) {
              validateSignature();
              controller.enqueue(prefix.subarray(0, prefixLength));
            }
            releaseReader();
            controller.close();
            return;
          }
          received += value.byteLength;
          if (received > maxBytes) throw new AttachmentUploadError(`Files must be ${maxBytes / (1024 * 1024)} MB or smaller`, 413);
          if (received > expectedLength) {
            throw new AttachmentUploadError("File size does not match the uploaded bytes", 400);
          }
          if (value.byteLength === 0) continue;
          // R2 knows the declared length. Verify EOF before forwarding the final chunk so a
          // dishonest extra tail or interrupted request cannot commit an apparently valid object.
          let atEnd = false;
          if (received === expectedLength) {
            while (true) {
              const tail = await reader.read();
              if (cancelled) return;
              if (tail.done) { atEnd = true; break; }
              if (tail.value.byteLength > 0) {
                const status = received + tail.value.byteLength > maxBytes ? 413 : 400;
                throw new AttachmentUploadError("File size does not match the uploaded bytes", status);
              }
            }
          }
          if (!checked) {
            const take = Math.min(prefix.length - prefixLength, value.byteLength);
            prefix.set(value.subarray(0, take), prefixLength);
            prefixLength += take;
            if (prefixLength < prefix.length && !atEnd) continue;
            validateSignature();
            controller.enqueue(prefix.subarray(0, prefixLength));
            if (take < value.byteLength) controller.enqueue(value.subarray(take));
          } else {
            controller.enqueue(value);
          }
          if (atEnd) {
            releaseReader();
            controller.close();
          }
          return;
        }
      } catch (error) {
        if (cancelled) return;
        await reader.cancel(error).catch(() => {});
        releaseReader();
        controller.error(error);
      }
    },
    async cancel(reason) {
      cancelled = true;
      try { await reader.cancel(reason); }
      finally { releaseReader(); }
    },
  }, { highWaterMark: 0 });
}

interface LengthStream {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

/** R2 needs a stream with a known length after validation wraps the original request body. */
export async function putR2Attachment(
  bucket: {
    put(key: string, body: ReadableStream<Uint8Array>, options: R2PutOptions & { onlyIf: Headers }): Promise<R2Object | null>;
    head(key: string): Promise<R2Object | null>;
  },
  key: string,
  body: ReadableStream<Uint8Array>,
  length: number,
  mediaType: string,
  makeLengthStream: (size: number) => LengthStream = (size) => new FixedLengthStream(size),
): Promise<void> {
  const stream = makeLengthStream(length);
  const abort = new AbortController();
  const pumping = body.pipeTo(stream.writable, { signal: abort.signal });
  async function stopProducer(reason?: unknown) {
    abort.abort(reason);
    // Abort alone waits for an outstanding write. Cancel the readable to unblock that write
    // when storage rejected the upload before it started reading (or skipped an existing key).
    await stream.readable.cancel(reason).catch(() => {});
  }
  const storing = Promise.resolve().then(() => bucket.put(key, stream.readable, {
    onlyIf: new Headers({ "If-None-Match": "*" }),
    httpMetadata: { contentType: mediaType },
  })).then(async (stored) => {
    // A retry can encounter a completed upload. Stop the producer if R2 skipped consumption.
    if (!stored) await stopProducer();
    return stored;
  }).catch(async (error: unknown) => {
    await stopProducer(error);
    throw error;
  });
  const [pumped, stored] = await Promise.allSettled([pumping, storing]);
  if (stored.status === "rejected" || stored.value === null) {
    // Some stream runtimes release the pipe's source without cancelling it on destination errors.
    await body.cancel(stored.status === "rejected" ? stored.reason : undefined).catch(() => {});
  }
  if (stored.status === "fulfilled" && stored.value === null) {
    const existing = await bucket.head(key);
    if (existing?.size === length && existing.httpMetadata?.contentType === mediaType) return;
    throw new AttachmentUploadError("Attachment id already exists with different metadata", 409);
  }
  if (pumped.status === "rejected" && pumped.reason instanceof AttachmentUploadError) throw pumped.reason;
  if (stored.status === "rejected") throw stored.reason;
  if (pumped.status === "rejected") throw pumped.reason;
}
