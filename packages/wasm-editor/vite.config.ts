import { defineConfig } from 'vite';

// Serves and builds the demo page (index.html). The editor itself is the
// library in src/, consumed from source like @tantaman/editor.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
