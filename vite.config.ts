import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Three builds from one codebase:
 *  - default ("full"): the React app served by the Express server (`npm start`).
 *  - `--mode pages`:   a static site for GitHub Pages. Set PAGES_BASE to the repo path
 *                      (e.g. "/ripple/") and optionally VITE_API_URL to a deployed server.
 *  - `--mode artifact`: one self-contained HTML file for the hosted preview.
 */
export default defineConfig(({ mode }) => {
  const buildMode = mode === 'artifact' ? 'artifact' : mode === 'pages' ? 'pages' : 'full';
  const base = buildMode === 'artifact' ? './' : buildMode === 'pages' ? (process.env.PAGES_BASE ?? '/') : '/';
  const outDir = buildMode === 'artifact' ? '../dist-artifact' : buildMode === 'pages' ? '../dist-pages' : '../dist';
  return {
    root: 'client',
    base,
    plugins: [react(), ...(buildMode === 'artifact' ? [viteSingleFile()] : []), ...(buildMode === 'pages' ? [spaFallback(outDir)] : [])],
    define: {
      __BUILD_MODE__: JSON.stringify(buildMode),
    },
    server: {
      port: 5173,
      fs: { allow: ['..'] },
      proxy: { '/api': 'http://localhost:8787' },
    },
    build: {
      outDir,
      emptyOutDir: true,
      chunkSizeWarningLimit: 1200,
    },
  };
});

/** GitHub Pages has no server-side routing: serve the app for unknown paths too. */
function spaFallback(outDir: string): Plugin {
  return {
    name: 'ripple-spa-fallback',
    apply: 'build',
    closeBundle() {
      const dir = resolve(__dirname, 'client', outDir);
      const index = resolve(dir, 'index.html');
      if (!existsSync(index)) return;
      copyFileSync(index, resolve(dir, '404.html'));
      writeFileSync(resolve(dir, '.nojekyll'), '');
    },
  };
}
