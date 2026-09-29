import { defineConfig, type Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import { MemoryStore, Room, Sequencer, newConnState, type Conn } from './src/collab/server-core.ts';

// Serves and builds the demo pages: index.html (DOM editor) and canvas.html
// (the editor that draws itself). The editor itself is the
// library in src/, consumed from source like @tantaman/editor.
export default defineConfig({
  base: './',
  plugins: [collabDevServer()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: 'index.html', canvas: 'canvas.html' },
    },
  },
});

/**
 * `pnpm dev` only: /api/collab/<id> backed by the same sequencer the Durable
 * Object runs, kept in memory, so canvas.html?doc=<id> in two tabs edits
 * together without Cloudflare (docs/COLLAB.md).
 */
function collabDevServer(): Plugin {
  return {
    name: 'collab-dev-server',
    apply: 'serve',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map<string, { room: Room; conns: Set<Conn> }>();
      let guests = 0;
      server.httpServer?.on('upgrade', (req, socket, head) => {
        const m = /^\/api\/collab\/([^/?]+)/.exec(req.url ?? '');
        if (!m) return; // Vite's own HMR socket
        const id = decodeURIComponent(m[1]);
        let entry = rooms.get(id);
        if (!entry) {
          const conns = new Set<Conn>();
          const room = new Room(new Sequencer(new MemoryStore()), {
            conns: () => conns,
            later: (fn, ms) => setTimeout(fn, ms),
          });
          entry = { room, conns };
          rooms.set(id, entry);
        }
        const { room, conns } = entry;
        wss.handleUpgrade(req, socket, head, (ws) => {
          const name = `guest ${++guests}`;
          const conn: Conn = {
            state: newConnState(name, name),
            send: (msg) => ws.send(JSON.stringify(msg)),
            save: () => {},
          };
          conns.add(conn);
          ws.on('message', (data) => {
            try {
              room.message(conn, JSON.parse(String(data)));
            } catch (err) {
              console.error('[collab]', err);
            }
          });
          ws.on('close', () => {
            conns.delete(conn);
            room.leave(conn);
          });
        });
      });
    },
  };
}
