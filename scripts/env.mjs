// Reads the Spotify Client ID from .env for the Electron main/preload builds.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../.env', import.meta.url));

export function clientIdDefine() {
  if (existsSync(file)) process.loadEnvFile(file);
  const id = process.env.SPOTIFY_CLIENT_ID?.trim() ?? '';
  if (!/^[0-9a-f]{32}$/i.test(id)) {
    throw new Error('Set SPOTIFY_CLIENT_ID in .env (see .env.example) to your Spotify app Client ID.');
  }
  return { __SPOTIFY_CLIENT_ID__: JSON.stringify(id) };
}
