// Live reload client script that gets injected into HTML pages
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
  
  // Start connection
  connect();
})();
</script>
`;

export function injectLiveReload(htmlContent) {
  // Only inject in development and if HTML has a closing body tag
  if (process.env.NODE_ENV === 'production') {
    return htmlContent;
  }
  
  const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
  if (bodyCloseIndex === -1) {
    // No body tag found, append to end
    return htmlContent + liveReloadScript;
  }
  
  // Insert before closing body tag
  return htmlContent.slice(0, bodyCloseIndex) + liveReloadScript + htmlContent.slice(bodyCloseIndex);
}