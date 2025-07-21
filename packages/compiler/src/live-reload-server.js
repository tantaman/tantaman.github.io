import { WebSocketServer } from 'ws';

let wss = null;
let clients = new Set();

export function startLiveReloadServer(port = 35729) {
  if (wss) {
    return; // Already running
  }

  try {
    wss = new WebSocketServer({ port });
    console.log(`Live reload server started on port ${port}`);

    wss.on('connection', (ws) => {
      console.log('Browser connected to live reload server');
      clients.add(ws);

      ws.on('close', () => {
        clients.delete(ws);
        console.log('Browser disconnected from live reload server');
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        clients.delete(ws);
      });
    });

    wss.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(
          `Port ${port} is already in use, live reload server not started`,
        );
      } else {
        console.error('Live reload server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start live reload server:', err);
  }
}

export function stopLiveReloadServer() {
  if (wss) {
    clients.clear();
    wss.close();
    wss = null;
    console.log('Live reload server stopped');
  }
}

export function notifyReload(changedFiles = []) {
  if (clients.size === 0) {
    return;
  }

  console.log(`Notifying ${clients.size} connected browser(s) to reload`);
  const message = JSON.stringify({ type: 'reload', files: changedFiles });

  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      try {
        ws.send(message);
      } catch (err) {
        console.error('Failed to send reload message:', err);
        clients.delete(ws);
      }
    } else {
      clients.delete(ws);
    }
  });
}
