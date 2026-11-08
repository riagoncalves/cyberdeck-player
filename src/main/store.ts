// The Spotify session in the app's user-data folder. Tokens are encrypted with
// the OS keyring (safeStorage) when one is available.
import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  /** The scopes Spotify granted (missing for sessions from older builds). */
  scope?: string;
}

const tokenFile = () => join(app.getPath('userData'), 'session.bin');

export const readTokens = (): Tokens | null => {
  if (!existsSync(tokenFile())) return null;
  try {
    const raw = readFileSync(tokenFile());
    const text = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const writeTokens = (tokens: Tokens) => {
  const text = JSON.stringify(tokens);
  const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text) : Buffer.from(text, 'utf8');
  writeFileSync(tokenFile(), data, { mode: 0o600 });
};

export const clearTokens = () => rmSync(tokenFile(), { force: true });
