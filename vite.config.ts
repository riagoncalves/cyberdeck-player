import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // The Spotify Client ID is compiled in from .env (see .env.example).
  const clientId = loadEnv(mode, __dirname, 'SPOTIFY_').SPOTIFY_CLIENT_ID?.trim() ?? '';
  if (!/^[0-9a-f]{32}$/i.test(clientId)) {
    throw new Error('Set SPOTIFY_CLIENT_ID in .env (see .env.example) to your Spotify app Client ID.');
  }

  return {
    root: 'src/renderer',
    base: './',
    plugins: [react()],
    define: { __SPOTIFY_CLIENT_ID__: JSON.stringify(clientId) },
    server: { port: 5173, strictPort: true },
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: true,
      // Car head units often ship an old, never-updated System WebView: compile modern
      // syntax down so the Android app still runs there.
      target: 'chrome69',
      cssTarget: 'chrome69',
    },
  };
});
