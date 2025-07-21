import express from 'express';
import fs from 'fs';
import path from 'path';
import { startLiveReloadServer, notifyReload } from './live-reload-server.js';

const app = express();
const PORT = 3000;
const STATIC_DIR = './docs';

// Live reload client script
const liveReloadScript = `
<script>
(function() {
  if (typeof window === 'undefined') return;
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const reconnectDelay = 1000;
  
  function connect() {
    const ws = new WebSocket('ws://localhost:35729');
    
    ws.onopen = function() {
      console.log('[Live Reload] Connected');
      reconnectAttempts = 0;
    };
    
    ws.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'reload') {
          console.log('[Live Reload] Reloading page...');
          window.location.reload();
        }
      } catch (e) {
        console.error('[Live Reload] Failed to parse message:', e);
      }
    };
    
    ws.onclose = function() {
      console.log('[Live Reload] Disconnected');
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(\`[Live Reload] Reconnecting in \${reconnectDelay}ms... (attempt \${reconnectAttempts})\`);
        setTimeout(connect, reconnectDelay);
      }
    };
    
    ws.onerror = function(error) {
      console.error('[Live Reload] WebSocket error:', error);
    };
  }
  
  connect();
})();
</script>
`;

// Custom middleware to serve files and inject live reload script
app.get('*', (req, res) => {
  const filePath = path.join(STATIC_DIR, req.path);

  // Helper function to inject live reload script into HTML
  function injectLiveReload(htmlContent) {
    const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
    if (bodyCloseIndex !== -1) {
      return (
        htmlContent.slice(0, bodyCloseIndex) +
        liveReloadScript +
        htmlContent.slice(bodyCloseIndex)
      );
    } else {
      return htmlContent + liveReloadScript;
    }
  }

  // Helper function to serve file with potential HTML injection
  function serveFile(targetPath, skipInject = false) {
    try {
      if (targetPath.endsWith('.html') && !skipInject) {
        // Read HTML file and inject live reload script
        const content = fs.readFileSync(targetPath, 'utf8');
        const modifiedContent = injectLiveReload(content);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(modifiedContent);
      } else {
        // Serve non-HTML files normally
        res.sendFile(path.resolve(targetPath));
      }
    } catch (err) {
      res.status(404).send('File not found');
    }
  }

  // Check if the file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath);
  } else {
    // Try to serve index.html
    const htmlPath = filePath.endsWith('.html')
      ? filePath
      : filePath + '/index.html';
    if (fs.existsSync(htmlPath)) {
      serveFile(htmlPath);
    } else {
      // Serve 404 page if it exists, otherwise default 404
      const notFoundPath = path.join(STATIC_DIR, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.status(404);
        serveFile(notFoundPath);
      } else {
        res.status(404).send('Page not found');
      }
    }
  }
});

export function startDevServer(port = PORT, staticDir = STATIC_DIR) {
  // Start the live reload WebSocket server
  startLiveReloadServer();

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Development server running at http://localhost:${port}`);
      console.log(`Serving files from: ${path.resolve(staticDir)}`);
      resolve(server);
    });
  });
}

export { notifyReload };
