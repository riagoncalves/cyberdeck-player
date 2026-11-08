// The platform bridge the UI uses as `window.deck`: the Electron preload on desktop,
// src/renderer/platform/android.ts inside the Android app.

export interface AuthStatus {
  signedIn: boolean;
  /** Signed in before the app asked for more permissions: sign in again to grant them. */
  needsReauth?: boolean;
}

/** What the Android media notification shows. */
export interface MediaInfo {
  title: string;
  artist: string;
  artUrl: string | null;
  playing: boolean;
}

export type MediaAction = 'play' | 'pause' | 'next' | 'previous';

export interface DeckApi {
  platform: 'desktop' | 'android';
  /** The redirect URI to register in the Spotify developer app. */
  redirectUri: string;
  /** Whether a Spotify session exists. */
  status(): Promise<AuthStatus>;
  /** Opens the Spotify login in the system browser; resolves once the app has tokens. */
  login(): Promise<void>;
  logout(): Promise<void>;
  /** A valid access token, refreshed when needed. */
  token(): Promise<string>;
  /** Widevine status, needed for in-app playback. */
  drm(): Promise<{ ready: boolean; detail: string }>;
  openExternal(url: string): Promise<void>;
  /**
   * The HTML of a playlist's public embed page (open.spotify.com/embed). Fetched outside
   * the page because Spotify doesn't allow it cross-origin.
   */
  playlistEmbed(id: string): Promise<string>;
  window: {
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
  };
  /** Android only: the system media notification for in-app playback (null hides it). */
  media?: {
    update(info: MediaInfo | null): void;
    onAction(handler: (action: MediaAction) => void): () => void;
  };
  /** Android only: the system back gesture. The handler returns true when the UI handled it. */
  onBack?(handler: () => boolean): () => void;
}

export const REDIRECT_PORT = 43821;
export const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
export const ANDROID_REDIRECT_URI = 'cyberdeck-player://callback';

// Compiled in from .env by Vite and esbuild (see .env.example).
declare const __SPOTIFY_CLIENT_ID__: string;
export const CLIENT_ID = __SPOTIFY_CLIENT_ID__;

/** Spotify IDs are 22 base-62 characters. */
export const SPOTIFY_ID = /^[0-9A-Za-z]{22}$/;

/** The Spotify scopes both sign-in flows ask for. */
export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-follow-read',
].join(' ');

/**
 * Whether a session was granted every scope the app asks for. Sessions from older builds
 * (or without a recorded scope) need to sign in again to pick up new permissions.
 */
export const hasAllScopes = (granted: string | undefined) => {
  if (!granted) return false;
  const have = new Set(granted.split(' '));
  return SCOPES.split(' ').every((s) => have.has(s));
};
