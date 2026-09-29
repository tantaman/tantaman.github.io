// A browser WebSocket for a collab client: JSON messages, and reconnecting
// with backoff when the connection drops (docs/COLLAB.md, "Protocol").

import type { ClientMsg, ServerMsg } from './protocol.ts';

export interface SocketHandlers {
  open(): void;
  message(msg: ServerMsg): void;
  close(): void;
}

export class CollabSocket {
  private readonly url: string;
  private ws: WebSocket | null = null;
  private handlers: SocketHandlers | null = null;
  private delay = 500;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(url: string | URL) {
    this.url = String(url);
  }

  start(handlers: SocketHandlers): void {
    this.handlers = handlers;
    this.connect();
  }

  send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }

  private connect(): void {
    if (this.stopped) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.delay = 500;
      this.handlers?.open();
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      let msg: ServerMsg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.handlers?.message(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.handlers?.close();
      if (this.stopped) return;
      this.timer = setTimeout(() => this.connect(), this.delay);
      this.delay = Math.min(this.delay * 2, 15_000);
    };
  }
}

/**
 * The same exports, with `after` run after every call. The collab client
 * reads the undo log after each call into the module this way.
 */
export function withAfter<T extends object>(exports: T, after: () => void): T {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(exports)) {
    out[name] =
      typeof value === 'function'
        ? (...args: unknown[]) => {
            const r = (value as (...a: unknown[]) => unknown)(...args);
            after();
            return r;
          }
        : value;
  }
  return out as T;
}
