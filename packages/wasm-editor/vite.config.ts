import { defineConfig } from 'vite';

// Serves and builds the demo pages: index.html (DOM editor) and canvas.html
// (the editor that draws itself). The editor itself is the
// library in src/, consumed from source like @tantaman/editor.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: 'index.html', canvas: 'canvas.html' },
    },
  },
});
