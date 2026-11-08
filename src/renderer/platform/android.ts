// `window.deck` inside the Android app. Sign-in is the same PKCE flow as on desktop, but it
// runs here: the browser comes back through the cyberdeck-player:// scheme, and tokens live
// in the WebView's storage, which is private to the app.
import { CapacitorHttp, registerPlugin } from '@capacitor/core';
import {
  ANDROID_REDIRECT_URI,
  CLIENT_ID,
  hasAllScopes,
  SCOPES,
  SPOTIFY_ID,
  type DeckApi,
  type MediaAction,
  type MediaInfo,
} from '../../shared/ipc';

interface Listener {
  remove(): Promise<void>;
}

/** The native side: android/app/src/main/java/dev/riagoncalves/cyberdeck/DeckPlugin.java */
interface NativeDeck {
  openUrl(options: { url: string }): Promise<void>;
  updateMedia(options: Partial<MediaInfo> & { active: boolean }): Promise<void>;
  exit(): Promise<void>;
  addListener(event: 'authCallback', fn: (data: { url: string }) => void): Promise<Listener>;
  addListener(event: 'media', fn: (data: { action: MediaAction }) => void): Promise<Listener>;
  addListener(event: 'back', fn: () => void): Promise<Listener>;
}

const native = registerPlugin<NativeDeck>('Deck');

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  /** The scopes Spotify granted (missing for sessions from older builds). */
  scope?: string;
}

const KEY_TOKENS = 'deck.tokens';

const read = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (size: number) => base64url(crypto.getRandomValues(new Uint8Array(size)));

const exchange = async (body: Record<string, string>): Promise<Tokens> => {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Spotify token request failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  return {
    accessToken: json.access_token,
    // Refreshes may or may not rotate the refresh token.
    refreshToken: json.refresh_token ?? read<Tokens>(KEY_TOKENS)?.refreshToken ?? '',
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
    scope: json.scope ?? read<Tokens>(KEY_TOKENS)?.scope,
  };
};

let pendingLogin: Promise<void> | null = null;

const login = (): Promise<void> => {
  if (pendingLogin) return pendingLogin;
  const clientId = CLIENT_ID;

  pendingLogin = (async () => {
    const verifier = random(64);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = base64url(new Uint8Array(digest));
    const state = random(16);

    let listener: Listener | undefined;
    const callback = new Promise<URL>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Login timed out.')), 5 * 60 * 1000);
      native
        .addListener('authCallback', ({ url }) => {
          clearTimeout(timeout);
          resolve(new URL(url));
        })
        .then((l) => (listener = l));
    });

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: ANDROID_REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: SCOPES,
      state,
    });
    await native.openUrl({ url: `https://accounts.spotify.com/authorize?${params}` });

    try {
      const url = await callback;
      const code = url.searchParams.get('code');
      if (url.searchParams.get('error') || !code || url.searchParams.get('state') !== state) {
        throw new Error(url.searchParams.get('error') ?? 'Login failed.');
      }
      write(
        KEY_TOKENS,
        await exchange({
          grant_type: 'authorization_code',
          code,
          redirect_uri: ANDROID_REDIRECT_URI,
          client_id: clientId,
          code_verifier: verifier,
        }),
      );
    } finally {
      listener?.remove();
      pendingLogin = null;
    }
  })();
  return pendingLogin;
};

let refreshing: Promise<string> | null = null;

const token = async (): Promise<string> => {
  const tokens = read<Tokens>(KEY_TOKENS);
  if (!tokens) throw new Error('Not signed in.');
  if (Date.now() < tokens.expiresAt) return tokens.accessToken;
  refreshing ??= (async () => {
    try {
      const next = await exchange({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: CLIENT_ID,
      });
      write(KEY_TOKENS, next);
      return next.accessToken;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
};

/** In-app playback needs Widevine from the phone's WebView. */
const drm = async () => {
  try {
    const access = await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [
      {
        initDataTypes: ['cenc'],
        audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }],
      },
    ]);
    await access.createMediaKeys();
    return { ready: true, detail: 'Widevine ready' };
  } catch (err) {
    return { ready: false, detail: `Widevine unavailable: ${(err as Error).message}` };
  }
};

export const androidDeck: DeckApi = {
  platform: 'android',
  redirectUri: ANDROID_REDIRECT_URI,
  status: async () => {
    const tokens = read<Tokens>(KEY_TOKENS);
    const complete = !!tokens && hasAllScopes(tokens.scope);
    return { signedIn: complete, needsReauth: !!tokens && !complete };
  },
  login,
  logout: async () => {
    localStorage.removeItem(KEY_TOKENS);
    native.updateMedia({ active: false });
  },
  token,
  drm,
  // Native HTTP: Spotify doesn't allow the embed page to be fetched from another origin.
  playlistEmbed: async (id) => {
    if (!SPOTIFY_ID.test(id)) throw new Error('Invalid playlist ID.');
    const res = await CapacitorHttp.get({ url: `https://open.spotify.com/embed/playlist/${id}`, responseType: 'text' });
    if (res.status !== 200) throw new Error(`Embed request failed (${res.status}).`);
    return String(res.data);
  },
  openExternal: async (url) => {
    if (/^https:\/\//.test(url)) await native.openUrl({ url });
  },
  window: { minimize: () => native.exit(), toggleMaximize: () => undefined, close: () => native.exit() },
  media: {
    update: (info) => {
      native.updateMedia(info ? { active: true, ...info } : { active: false });
    },
    onAction: (handler) => {
      const listener = native.addListener('media', ({ action }) => handler(action));
      return () => void listener.then((l) => l.remove());
    },
  },
  onBack: (handler) => {
    backHandlers.push(handler);
    return () => {
      const i = backHandlers.lastIndexOf(handler);
      if (i >= 0) backHandlers.splice(i, 1);
    };
  },
};

// The newest handler (e.g. an open dialog) gets the back gesture first.
const backHandlers: (() => boolean)[] = [];
native.addListener('back', () => {
  for (let i = backHandlers.length - 1; i >= 0; i--) if (backHandlers[i]()) return;
  // Nothing left to go back to: leave the app in the background, music keeps playing.
  native.exit();
});
