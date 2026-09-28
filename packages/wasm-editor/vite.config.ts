import { defineConfig } from 'vite';

// Serves and builds the demo pages: index.html (the editor that draws itself)
// and dom.html (the engine behind a contenteditable). canvas.html redirects
// to index.html, where the canvas editor used to live. The editor itself is the
// library in src/, consumed from source like @tantaman/editor.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: 'index.html', dom: 'dom.html', canvas: 'canvas.html' },
    },
  },
});
