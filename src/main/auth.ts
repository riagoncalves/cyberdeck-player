// Spotify sign-in with Authorization Code + PKCE: no client secret is needed or stored.
// The login opens in the system browser and comes back to a one-shot loopback server.
import { shell } from 'electron';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { CLIENT_ID, hasAllScopes, REDIRECT_PORT, REDIRECT_URI, SCOPES, type AuthStatus } from '../shared/ipc';
import { clearTokens, readTokens, type Tokens, writeTokens } from './store';

const base64url = (buf: Buffer) => buf.toString('base64url');

const callbackPage = (title: string, message: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07050d;color:#e5e7eb;
    font:16px/1.6 ui-monospace,monospace;text-align:center}
  h1{color:#00f0ff;text-shadow:0 0 18px rgba(0,240,255,.6);letter-spacing:.2em;text-transform:uppercase}
  p{color:#9ca3af}
</style></head>
<body><div><h1>${title}</h1><p>${message}</p></div></body></html>`;

const exchange = async (body: Record<string, string>): Promise<Tokens> => {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Spotify token request failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  const previous = readTokens();
  return {
    accessToken: json.access_token,
    // Refreshes may or may not rotate the refresh token.
    refreshToken: json.refresh_token ?? previous?.refreshToken ?? '',
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
    scope: json.scope ?? previous?.scope,
  };
};

let pendingLogin: Promise<void> | null = null;

export const login = (): Promise<void> => {
  if (pendingLogin) return pendingLogin;
  const clientId = CLIENT_ID;

  const verifier = base64url(randomBytes(64));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const state = base64url(randomBytes(16));

  pendingLogin = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Login timed out.')), 5 * 60 * 1000);

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', REDIRECT_URI);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      if (error || !code || url.searchParams.get('state') !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(callbackPage('Access denied', 'Login was cancelled or failed. Go back to Cyberdeck Player and try again.'));
        finish(new Error(error ?? 'Login failed.'));
        return;
      }
      try {
        writeTokens(
          await exchange({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: clientId,
            code_verifier: verifier,
          }),
        );
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(callbackPage('Jacked in', 'You are signed in. You can close this tab and go back to Cyberdeck Player.'));
        finish();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(callbackPage('Link failed', 'Could not finish signing in. Check the Client ID and redirect URI.'));
        finish(err as Error);
      }
    });

    function finish(err?: Error) {
      clearTimeout(timeout);
      server.close();
      pendingLogin = null;
      if (err) reject(err);
      else resolve();
    }

    server.on('error', (err) => finish(err));
    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        scope: SCOPES,
        state,
      });
      shell.openExternal(`https://accounts.spotify.com/authorize?${params}`);
    });
  });
  return pendingLogin;
};

let refreshing: Promise<string> | null = null;

export const accessToken = async (): Promise<string> => {
  const tokens = readTokens();
  if (!tokens) throw new Error('Not signed in.');
  if (Date.now() < tokens.expiresAt) return tokens.accessToken;
  refreshing ??= (async () => {
    try {
      const next = await exchange({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: CLIENT_ID });
      writeTokens(next);
      return next.accessToken;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
};

export const logout = () => clearTokens();
export const authStatus = (): AuthStatus => {
  const tokens = readTokens();
  const complete = !!tokens && hasAllScopes(tokens.scope);
  return { signedIn: complete, needsReauth: !!tokens && !complete };
};
