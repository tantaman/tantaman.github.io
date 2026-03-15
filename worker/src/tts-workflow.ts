import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "./index.js";
import { chunkText } from "./tts-utils.js";

type TtsParams = { pasteId: string; text: string };

export class TtsWorkflow extends WorkflowEntrypoint<Env, TtsParams> {
  async run(event: WorkflowEvent<TtsParams>, step: WorkflowStep) {
    const { pasteId, text } = event.payload;

    // Step 1: Chunk the text
    const chunks = await step.do("chunk-text", async () => {
      return chunkText(text, 1900);
    });

    const totalChunks = chunks.length;

    // Steps 2..N: Generate audio for each chunk, store in R2 immediately
    for (let i = 0; i < totalChunks; i++) {
      await step.do(
        `tts-chunk-${i}`,
        {
          retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
        },
        async () => {
          const response: Response = await (this.env.AI as any).run(
            "@cf/deepgram/aura-2-en" as any,
            { text: chunks[i], speaker: "luna" },
            { returnRawResponse: true },
          );
          if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`TTS failed (${response.status}): ${body}`);
          }
          const buf = await response.arrayBuffer();
          if (buf.byteLength === 0) throw new Error("Empty audio");

          // Store chunk immediately in R2
          await this.env.AUDIO_BUCKET.put(
            `paste/${pasteId}/chunk-${i}.mp3`,
            buf,
            {
              httpMetadata: { contentType: "audio/mpeg" },
              customMetadata: { totalChunks: String(totalChunks) },
            },
          );
        },
      );
    }

    // Final step: Concatenate all chunks into a single file for cached access
    await step.do("concatenate", async () => {
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const obj = await this.env.AUDIO_BUCKET.get(
          `paste/${pasteId}/chunk-${i}.mp3`,
        );
        if (!obj) throw new Error(`Missing chunk ${i}`);
        buffers.push(await obj.arrayBuffer());
      }
      const totalLen = buffers.reduce((sum, b) => sum + b.byteLength, 0);
      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const buf of buffers) {
        result.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }
      await this.env.AUDIO_BUCKET.put(
        `paste/${pasteId}.mp3`,
        result.buffer as ArrayBuffer,
        {
          httpMetadata: { contentType: "audio/mpeg" },
        },
      );

      // Clean up individual chunks
      for (let i = 0; i < totalChunks; i++) {
        await this.env.AUDIO_BUCKET.delete(
          `paste/${pasteId}/chunk-${i}.mp3`,
        );
      }
    });

    return { ok: true, totalChunks };
  }
}
