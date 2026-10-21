import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode artifact` builds a single self-contained HTML file for the hosted demo.
export default defineConfig(({ mode }) => ({
  root: 'client',
  base: './',
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  define: {
    __DEMO_BUILD__: JSON.stringify(mode === 'artifact'),
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    outDir: mode === 'artifact' ? '../dist-artifact' : '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
}));
